import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryDto, UpdateInventoryDto } from './dto/inventory.dto';
import { CreateOrderDto, UpdateOrderDto, ShipOrderDto } from './dto/order.dto';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { QwenAIService } from '../common/services/qwen-ai.service';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import { customAlphabet } from 'nanoid';

// 生成不重复订单号
const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);
const generateOrderNo = () => `ORD-${nanoid()}`;

const STATS_CACHE_TTL = 30000; // 30 秒

@Injectable()
export class DistributionService {
  private statsCache: { data: any; timestamp: number } | null = null;

  constructor(
    private prisma: PrismaService,
    private qwenAI: QwenAIService,
  ) {}

  /** 主动清除统计缓存 */
  private invalidateStatsCache() {
    this.statsCache = null;
  }

  private setStatsCache(data: any) {
    this.statsCache = { data, timestamp: Date.now() };
  }

  // ==================== 统计 ====================

  async getStatistics() {
    const now = Date.now();
    if (this.statsCache && now - this.statsCache.timestamp < STATS_CACHE_TTL) {
      return this.statsCache.data;
    }

    const [inventoryStats, orderStats, customerCount] = await Promise.all([
      this.prisma.inventoryStock.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { weight: true, pieceCount: true },
      }),
      this.prisma.distributionOrder.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      this.prisma.customer.count({ where: { deletedAt: null } }),
    ]);

    const inventory = {
      total: 0,
      available: 0,
      reserved: 0,
      shipped: 0,
      totalWeight: '0',
      totalPieces: 0,
    };

    const order = {
      total: 0,
      draft: 0,
      shipping: 0,
      shipped: 0,
      cancelled: 0,
    };

    for (const stat of inventoryStats) {
      inventory.total += stat._count.id;
      inventory.totalWeight = String(
        Number(inventory.totalWeight) + Number(stat._sum.weight || 0),
      );
      inventory.totalPieces += stat._sum.pieceCount || 0;
      if (stat.status === 'available') inventory.available = stat._count.id;
      if (stat.status === 'reserved') inventory.reserved = stat._count.id;
      if (stat.status === 'shipped') inventory.shipped = stat._count.id;
    }

    for (const stat of orderStats) {
      order.total += stat._count.id;
      if (stat.status === 'draft') order.draft = stat._count.id;
      if (stat.status === 'shipping') order.shipping = stat._count.id;
      if (stat.status === 'shipped') order.shipped = stat._count.id;
      if (stat.status === 'cancelled') order.cancelled = stat._count.id;
    }

    const result = { inventory, order, customer: { total: customerCount } };
    this.setStatsCache(result);
    return result;
  }

  // ==================== 库存管理 ====================

  async getInventoryList(params: {
    page?: number;
    limit?: number;
    keyword?: string;
    grade?: string;
    status?: string;
    productType?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryStockWhereInput = {};
    if (params.keyword) {
      where.OR = [
        { batchNo: { contains: params.keyword } },
        { grade: { contains: params.keyword } },
        { specification: { contains: params.keyword } },
        { location: { contains: params.keyword } },
      ];
    }
    if (params.grade) where.grade = params.grade;
    if (params.status) where.status = params.status;
    if (params.productType) where.productType = params.productType;

    const [data, total] = await Promise.all([
      this.prisma.inventoryStock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryStock.count({ where }),
    ]);

    return { data, total, page, pageSize: limit };
  }

  // 库存远程搜索（用于 el-select）
  async searchInventory(keyword: string, limit = 20) {
    const where: Prisma.InventoryStockWhereInput = {
      status: 'available',
    };

    if (keyword && keyword.trim()) {
      where.OR = [
        { batchNo: { contains: keyword } },
        { grade: { contains: keyword } },
        { specification: { contains: keyword } },
        { location: { contains: keyword } },
      ];
    }

    return this.prisma.inventoryStock.findMany({
      where,
      take: Math.min(50, Number(limit)),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        batchNo: true,
        grade: true,
        specification: true,
        productType: true,
        weight: true,
        pieceCount: true,
        location: true,
        status: true,
      },
    });
  }

  async getInventoryById(id: number) {
    const item = await this.prisma.inventoryStock.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('库存记录不存在');
    return item;
  }

  async createInventory(dto: CreateInventoryDto) {
    this.invalidateStatsCache();
    return this.prisma.inventoryStock.create({
      data: {
        ...dto,
        weight: dto.weight,
        sourceType: dto.sourceType || 'manual',
        status: 'available',
      },
    });
  }

  async batchCreateInventory(items: CreateInventoryDto[], recognitionHistoryId?: number) {
    const result = await this.prisma.inventoryStock.createMany({
      data: items.map((item) => ({
        ...item,
        sourceType: 'batch_import',
        status: 'available',
      })),
    });

    // 如果传入了识别历史ID，更新历史记录中的 specification 为用户选择的值
    if (recognitionHistoryId) {
      const history = await this.prisma.aiRecognitionHistory.findUnique({
        where: { id: recognitionHistoryId },
      });
      if (history?.result) {
        try {
          const parsed = JSON.parse(history.result);
          const userSpec = items.find(i => i.specification)?.specification;
          if (userSpec && Array.isArray(parsed)) {
            const updated = parsed.map((item: any) => ({
              ...item,
              specification: userSpec,
            }));
            await this.prisma.aiRecognitionHistory.update({
              where: { id: recognitionHistoryId },
              data: { result: JSON.stringify(updated) },
            });
          }
        } catch (e) {
          console.error('[batchCreateInventory] 更新识别历史失败:', e);
        }
      }
    }

    this.invalidateStatsCache();
    return result;
  }

  async updateInventory(id: number, dto: UpdateInventoryDto) {
    const item = await this.prisma.inventoryStock.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('库存记录不存在');
    if (item.status === 'shipped' || item.status === 'reserved') {
      throw new BadRequestException('已发货或预留状态的库存不可修改');
    }

    this.invalidateStatsCache();
    return this.prisma.inventoryStock.update({
      where: { id },
      data: dto as Prisma.InventoryStockUpdateInput,
    });
  }

  async deleteInventory(id: number) {
    const item = await this.prisma.inventoryStock.findUnique({
      where: { id },
      include: { orderItems: { include: { order: true } } },
    });
    if (!item) throw new NotFoundException('库存记录不存在');

    const hasActiveOrders = item.orderItems.some(
      (oi) => !oi.order?.deletedAt && oi.order?.status !== 'shipped' && oi.order?.status !== 'cancelled',
    );
    if (hasActiveOrders) {
      throw new BadRequestException('该库存被有效配货单引用，无法删除');
    }

    this.invalidateStatsCache();
    return this.prisma.inventoryStock.delete({ where: { id } });
  }

  async batchDeleteInventory(ids: number[]) {
    const items = await this.prisma.inventoryStock.findMany({
      where: { id: { in: ids } },
      include: { orderItems: { include: { order: true } } },
    });

    // 精确校验：逐个检查每个 id 的状态
    const notFound: number[] = [];
    const referenced: number[] = [];

    for (const item of items) {
      const hasActiveOrders = item.orderItems.some(
        (oi) => !oi.order?.deletedAt && oi.order?.status !== 'shipped' && oi.order?.status !== 'cancelled',
      );
      if (hasActiveOrders) {
        referenced.push(item.id);
      }
    }

    // 检查传入的 id 是否有未找到的
    const foundIds = new Set(items.map(i => i.id));
    for (const id of ids) {
      if (!foundIds.has(id)) {
        notFound.push(id);
      }
    }

    if (notFound.length > 0) {
      throw new BadRequestException(`以下库存记录不存在：${notFound.join(', ')}`);
    }
    if (referenced.length > 0) {
      throw new BadRequestException(`以下库存被有效配货单引用，无法删除：${referenced.join(', ')}`);
    }

    this.invalidateStatsCache();
    return this.prisma.inventoryStock.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async aiRecognize(file: Express.Multer.File) {
    if (!file) {
      throw new Error('请上传图片文件');
    }

    const buffer = await fs.promises.readFile(file.path);
    const base64 = buffer.toString('base64');

    let aiResults: any[];
    try {
      aiResults = await this.qwenAI.recognizeImage(base64);
    } catch (error: any) {
      await this.prisma.aiRecognitionHistory.create({
        data: {
          imageUrl: `/uploads/inventory/${file.filename}`,
          result: null,
          itemCount: 0,
          status: 'failed',
          errorMessage: error.message,
        },
      });
      try {
        await fs.promises.unlink(file.path);
      } catch (unlinkError) {
        console.error('[AI] 临时文件清理失败:', unlinkError);
      }
      throw error;
    }

    const history = await this.prisma.aiRecognitionHistory.create({
      data: {
        imageUrl: `/uploads/inventory/${file.filename}`,
        result: JSON.stringify(aiResults),
        itemCount: aiResults.length,
        status: 'success',
        batchNo: aiResults[0]?.batchNo,
        grade: aiResults[0]?.grade,
        date: aiResults[0]?.date ? new Date(aiResults[0].date) : null,
      },
    });

    return { results: aiResults, historyId: history.id };
  }

  // ==================== 客户管理 ====================

  async getCustomers() {
    return this.prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCustomerById(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!customer) throw new NotFoundException('客户不存在');
    return customer;
  }

  async createCustomer(dto: CreateCustomerDto) {
    this.invalidateStatsCache();
    return this.prisma.customer.create({ data: dto });
  }

  async updateCustomer(id: number, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('客户不存在');

    this.invalidateStatsCache();
    return this.prisma.customer.update({
      where: { id },
      data: dto as Prisma.CustomerUpdateInput,
    });
  }

  async deleteCustomer(id: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('客户不存在');

    this.invalidateStatsCache();
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==================== 配货单管理 ====================

  async getOrderList(params: {
    page?: number;
    limit?: number;
    status?: string;
    customerId?: number;
    includeItems?: boolean;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.DistributionOrderWhereInput = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.customerId) where.customerId = params.customerId;

    // 默认不包含明细，按需加载
    const include = {
      customer: { select: { id: true, name: true } },
      ...(params.includeItems ? { items: { include: { stock: true } } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.distributionOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include,
      }),
      this.prisma.distributionOrder.count({ where }),
    ]);

    return { data, total, page, pageSize: limit };
  }

  async getOrderById(id: number) {
    const order = await this.prisma.distributionOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: { stock: true },
        },
      },
    });
    if (!order || order.deletedAt) throw new NotFoundException('订单不存在');
    return order;
  }

  async createOrder(dto: CreateOrderDto) {
    const orderNo = generateOrderNo();

    const totalWeight = dto.items.reduce((sum, item) => sum + item.weight, 0);
    const totalPieces = dto.items.reduce((sum, item) => sum + item.pieceCount, 0);

    // 校验客户存在性（在事务外）
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    const stockIds = dto.items.map((i) => i.stockId);

    const order = await this.prisma.$transaction(async (tx) => {
      const stocks = await tx.inventoryStock.findMany({
        where: { id: { in: stockIds }, status: 'available' },
      });
      const stockMap = new Map(stocks.map((s) => [s.id, s]));

      for (const item of dto.items) {
        const stock = stockMap.get(item.stockId);
        if (!stock) {
          throw new BadRequestException(`库存 #${item.stockId} 不存在或不可用`);
        }
      }

      const newOrder = await tx.distributionOrder.create({
        data: {
          orderNo,
          customerId: dto.customerId,
          customerName: dto.customerName || customer.name,
          productSpec: dto.productSpec,
          targetGrade: dto.targetGrade,
          remark: dto.remark,
          totalWeight,
          totalPieces,
          status: 'draft',
          items: {
            create: dto.items.map((item) => ({
              stockId: item.stockId,
              weight: item.weight,
              pieceCount: item.pieceCount,
            })),
          },
        },
      });

      const updateResult = await tx.inventoryStock.updateMany({
        where: { id: { in: stockIds }, status: 'available' },
        data: { status: 'reserved' },
      });
      if (updateResult.count !== stockIds.length) {
        throw new BadRequestException('部分库存已被其他订单占用');
      }

      return newOrder;
    });

    // 清除统计缓存
    this.invalidateStatsCache();
    return order;
  }

  async updateOrder(id: number, dto: UpdateOrderDto) {
    const order = await this.prisma.distributionOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order || order.deletedAt) throw new NotFoundException('订单不存在');
    if (order.status !== 'draft') {
      throw new BadRequestException('只有草稿状态的订单可以修改');
    }

    this.invalidateStatsCache();
    return this.prisma.distributionOrder.update({
      where: { id },
      data: dto as Prisma.DistributionOrderUpdateInput,
    });
  }

  async shipOrder(id: number, dto: ShipOrderDto) {
    const order = await this.prisma.distributionOrder.findUnique({
      where: { id },
    });
    if (!order || order.deletedAt) throw new NotFoundException('订单不存在');
    if (order.status !== 'draft') {
      throw new BadRequestException('只有草稿状态的订单可以发货');
    }

    const result = await this.prisma.distributionOrder.update({
      where: { id },
      data: {
        status: 'shipping',
        driverName: dto.driverName,
        vehicleNo: dto.vehicleNo,
      },
    });

    this.invalidateStatsCache();
    return result;
  }

  async deliverOrder(id: number) {
    const order = await this.prisma.distributionOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order || order.deletedAt) throw new NotFoundException('订单不存在');
    if (order.status !== 'shipping') {
      throw new BadRequestException('只有发货中的订单可以完成发运');
    }

    const stockIds = order.items.map((i) => i.stockId);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.distributionOrder.update({
        where: { id },
        data: { status: 'shipped', shippedAt: new Date() },
      });

      await tx.inventoryStock.updateMany({
        where: { id: { in: stockIds } },
        data: { status: 'shipped' },
      });

      return tx.distributionOrder.findUnique({ where: { id } });
    });

    this.invalidateStatsCache();
    return result;
  }

  async cancelOrder(id: number) {
    const order = await this.prisma.distributionOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order || order.deletedAt) throw new NotFoundException('订单不存在');
    if (order.status === 'shipped' || order.status === 'cancelled') {
      throw new BadRequestException('已发货或已取消的订单无法取消');
    }

    const stockIds = order.items.map((i) => i.stockId);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.distributionOrder.update({
        where: { id },
        data: { status: 'cancelled' },
      });

      await tx.inventoryStock.updateMany({
        where: { id: { in: stockIds } },
        data: { status: 'available' },
      });

      return tx.distributionOrder.findUnique({ where: { id } });
    });

    this.invalidateStatsCache();
    return result;
  }

  async deleteOrder(id: number) {
    const order = await this.prisma.distributionOrder.findUnique({
      where: { id },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'shipped' && order.status !== 'cancelled') {
      throw new BadRequestException('只能删除已发货或已取消的订单');
    }

    this.invalidateStatsCache();
    return this.prisma.distributionOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async batchDeleteOrders(ids: number[]) {
    const orders = await this.prisma.distributionOrder.findMany({
      where: { id: { in: ids } },
    });

    const deletableOrders = orders.filter(
      (o) => o.status === 'shipped' || o.status === 'cancelled',
    );

    if (deletableOrders.length !== orders.length) {
      const undeletable = orders
        .filter((o) => o.status !== 'shipped' && o.status !== 'cancelled')
        .map((o) => o.orderNo);
      throw new BadRequestException(
        `以下订单不可删除：${undeletable.join(', ')}，只能删除已发货或已取消的订单`,
      );
    }

    const deletableIds = deletableOrders.map((o) => o.id);

    this.invalidateStatsCache();
    return this.prisma.distributionOrder.updateMany({
      where: { id: { in: deletableIds } },
      data: { deletedAt: new Date() },
    });
  }

  // ==================== AI 识别历史 ====================

  async getRecognitionHistory(params: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AiRecognitionHistoryWhereInput = {};
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.prisma.aiRecognitionHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiRecognitionHistory.count({ where }),
    ]);

    return { data, total, page, pageSize: limit };
  }

  async deleteRecognitionHistory(id: number) {
    return this.prisma.aiRecognitionHistory.delete({ where: { id } });
  }

  async batchDeleteRecognitionHistory(ids: number[]) {
    return this.prisma.aiRecognitionHistory.deleteMany({
      where: { id: { in: ids } },
    });
  }
}
