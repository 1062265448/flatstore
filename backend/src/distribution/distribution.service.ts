import { Injectable, BadRequestException, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryDto, UpdateInventoryDto } from './dto/inventory.dto';
import { CreateOrderDto, UpdateOrderDto, ShipOrderDto } from './dto/order.dto';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { StockStatus, OrderStatus } from '@prisma/client';
import { QwenAIService } from '../common/services/qwen-ai.service';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import { customAlphabet } from 'nanoid';

/** 生成配货单号：PMK + 日期 + 当日序号 */

const STATS_CACHE_TTL = 30000; // 30 秒

@Injectable()
export class DistributionService implements OnModuleInit {
  private readonly logger = new Logger(DistributionService.name);
  private statsCache: { data: any; timestamp: number } | null = null;

  constructor(
    private prisma: PrismaService,
    private qwenAI: QwenAIService,
  ) {}

  /** 启动后初始化定时清理 */
  onModuleInit() {
    this.cleanupOldHistory();
    // 每24小时清理一次
    setInterval(() => this.cleanupOldHistory(), 24 * 60 * 60 * 1000);
  }

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
    specification?: string;
    dateFrom?: string;
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
    if (params.status) where.status = params.status as StockStatus;
    if (params.productType) where.productType = params.productType;
    if (params.specification) where.specification = { contains: params.specification };
    if (params.dateFrom) {
      const from = new Date(params.dateFrom);
      const to = new Date(params.dateFrom);
      to.setHours(23, 59, 59, 999);
      where.createdAt = { gte: from, lte: to } as any;
    }

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
      include: {
        orderItems: {
          include: {
            order: {
              select: { id: true, orderNo: true, status: true, customerName: true, deletedAt: true },
            },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('库存记录不存在');
    // 过滤已删除的订单，返回有效关联
    const activeOrders = item.orderItems
      .filter((oi) => !oi.order?.deletedAt)
      .map((oi) => ({
        orderId: oi.order.id,
        orderNo: oi.order.orderNo,
        status: oi.order.status,
        customerName: oi.order.customerName,
      }));
    const { orderItems, ...inventory } = item;
    return { ...inventory, linkedOrders: activeOrders };
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
    let warnings: string[] = [];
    try {
      aiResults = await this.qwenAI.recognizeImage(base64);
      // 交叉校验 + 纠错
      const validated = this.qwenAI.crossValidate(aiResults);
      aiResults = validated.results;
      warnings = validated.warnings;
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

    // 文件保留在 uploads/inventory/ 供缩略图显示
    return { results: aiResults, historyId: history.id, warnings };
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
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          where: { deletedAt: null, status: { in: ['draft', 'shipping'] } },
          take: 1,
        },
      },
    });
    if (!customer) throw new NotFoundException('客户不存在');
    if (customer.orders.length > 0) {
      throw new BadRequestException('该客户有进行中的配货单，无法删除');
    }

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
    keyword?: string;
    includeItems?: boolean;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.DistributionOrderWhereInput = { deletedAt: null };
    if (params.keyword) {
      where.OR = [
        { orderNo: { contains: params.keyword } },
        { customerName: { contains: params.keyword } },
      ];
    }
    if (params.status) where.status = params.status as OrderStatus;
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

  /** 生成配货单号：PMK + 日期(YYYYMMDD) + 01 + 当日序号(2位) */
  private async generateOrderNo(): Promise<string> {
    const now = new Date();
    const dateStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');

    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);

    const count = await this.prisma.distributionOrder.count({
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
    });

    const seq = String(count + 1).padStart(2, '0');
    return `PMK${dateStr}01${seq}`;
  }

  async createOrder(dto: CreateOrderDto) {
    const orderNo = await this.generateOrderNo();

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

    // 防重校验：同一库存不可被同一订单选择两次
    const uniqueStockIds = [...new Set(stockIds)];
    if (uniqueStockIds.length !== stockIds.length) {
      throw new BadRequestException('同一库存不可重复选择');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const stocks = await tx.inventoryStock.findMany({
        where: { id: { in: uniqueStockIds }, status: 'available' },
      });
      const stockMap = new Map(stocks.map((s) => [s.id, s]));

      for (const item of dto.items) {
        const stock = stockMap.get(item.stockId);
        if (!stock) {
          throw new BadRequestException(`库存 #${item.stockId} 不存在或不可用`);
        }
      }

      // 自动聚合库存的 productType / specification
      const productType = dto.productType || stocks[0]?.productType || undefined;
      const specification = dto.specification || stocks[0]?.specification || undefined;

      const newOrder = await tx.distributionOrder.create({
        data: {
          orderNo,
          customerId: dto.customerId,
          customerName: dto.customerName || customer.name,
          productType,
          specification,
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
        where: { id: { in: uniqueStockIds }, status: 'available' },
        data: { status: 'reserved' },
      });
      if (updateResult.count !== uniqueStockIds.length) {
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

    // 如果传了 items，支持重新关联库存
    if (dto.items && dto.items.length > 0) {
      const stockIds = dto.items.map((i) => i.stockId);
      const uniqueStockIds = [...new Set(stockIds)];
      if (uniqueStockIds.length !== stockIds.length) {
        throw new BadRequestException('同一库存不可重复选择');
      }

      const totalWeight = dto.items.reduce((sum, item) => sum + item.weight, 0);
      const totalPieces = dto.items.reduce((sum, item) => sum + item.pieceCount, 0);

      const result = await this.prisma.$transaction(async (tx) => {
        // 释放旧库存
        const oldStockIds = order.items.map((i) => i.stockId);
        await tx.inventoryStock.updateMany({
          where: { id: { in: oldStockIds }, status: 'reserved' },
          data: { status: 'available' },
        });

        // 校验新库存可用
        const stocks = await tx.inventoryStock.findMany({
          where: { id: { in: uniqueStockIds }, status: 'available' },
        });
        const stockMap = new Map(stocks.map((s) => [s.id, s]));
        for (const item of dto.items!) {
          const stock = stockMap.get(item.stockId);
          if (!stock) {
            throw new BadRequestException(`库存 #${item.stockId} 不存在或不可用`);
          }
        }

        // 锁定新库存
        const updateResult = await tx.inventoryStock.updateMany({
          where: { id: { in: uniqueStockIds }, status: 'available' },
          data: { status: 'reserved' },
        });
        if (updateResult.count !== uniqueStockIds.length) {
          throw new BadRequestException('部分库存已被其他订单占用');
        }

        // 删除旧明细 + 创建新明细
        await tx.distributionOrderItem.deleteMany({ where: { orderId: id } });

        return tx.distributionOrder.update({
          where: { id },
          data: {
            customerId: dto.customerId ?? order.customerId,
            customerName: dto.customerName ?? order.customerName,
            productSpec: dto.productSpec ?? order.productSpec,
            targetGrade: dto.targetGrade ?? order.targetGrade,
            remark: dto.remark ?? order.remark,
            totalWeight,
            totalPieces,
            items: {
              create: dto.items.map((item) => ({
                stockId: item.stockId,
                weight: item.weight,
                pieceCount: item.pieceCount,
              })),
            },
          },
          include: { items: { include: { stock: true } } },
        });
      });

      this.invalidateStatsCache();
      return result;
    }

    // 不涉及 items，简单更新元数据
    this.invalidateStatsCache();
    return this.prisma.distributionOrder.update({
      where: { id },
      data: {
        ...(dto.customerId !== undefined && { customerId: dto.customerId }),
        ...(dto.customerName !== undefined && { customerName: dto.customerName }),
        ...(dto.productSpec !== undefined && { productSpec: dto.productSpec }),
        ...(dto.targetGrade !== undefined && { targetGrade: dto.targetGrade }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
      },
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
    if (!dto.driverName?.trim()) {
      throw new BadRequestException('请填写司机姓名');
    }
    if (!dto.vehicleNo?.trim()) {
      throw new BadRequestException('请填写车牌号');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      return tx.distributionOrder.update({
        where: { id },
        data: {
          status: 'shipping',
          driverName: dto.driverName.trim(),
          vehicleNo: dto.vehicleNo.trim(),
        },
      });
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
      // 前置校验：所有库存必须是 reserved 状态
      const stocks = await tx.inventoryStock.findMany({
        where: { id: { in: stockIds } },
        select: { id: true, status: true },
      });
      const notReserved = stocks.filter(s => s.status !== 'reserved');
      if (notReserved.length > 0) {
        throw new BadRequestException(`库存状态异常，请联系管理员（库存ID: ${notReserved.map(s => s.id).join(', ')}）`);
      }

      await tx.distributionOrder.update({
        where: { id },
        data: { status: 'shipped', shippedAt: new Date() },
      });

      await tx.inventoryStock.updateMany({
        where: { id: { in: stockIds }, status: 'reserved' },
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
      include: { items: { select: { stockId: true } } },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'shipped' && order.status !== 'cancelled') {
      throw new BadRequestException('只能删除已发货或已取消的订单');
    }

    const stockIds = order.items.map((i) => i.stockId);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.distributionOrder.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // 释放库存：已取消的订单释放回可用，已发货的也释放（用于数据修正场景）
      if (stockIds.length > 0) {
        await tx.inventoryStock.updateMany({
          where: { id: { in: stockIds }, status: { in: ['reserved', 'shipped'] } },
          data: { status: 'available' },
        });
      }

      return tx.distributionOrder.findUnique({ where: { id } });
    });

    this.invalidateStatsCache();
    return result;
  }

  async batchDeleteOrders(ids: number[]) {
    const orders = await this.prisma.distributionOrder.findMany({
      where: { id: { in: ids } },
      include: { items: { select: { stockId: true } } },
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

    // 收集所有需释放的 stockId
    const allStockIds = deletableOrders.flatMap((o) =>
      o.items.map((i) => i.stockId),
    );
    const uniqueStockIds = [...new Set(allStockIds)];

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.distributionOrder.updateMany({
        where: { id: { in: deletableIds } },
        data: { deletedAt: new Date() },
      });

      if (uniqueStockIds.length > 0) {
        await tx.inventoryStock.updateMany({
          where: { id: { in: uniqueStockIds }, status: { in: ['reserved', 'shipped'] } },
          data: { status: 'available' },
        });
      }

      return { deletedCount: deletableIds.length, releasedStockCount: uniqueStockIds.length };
    });

    this.invalidateStatsCache();
    return result;
  }

  // ==================== AI 识别历史 ====================

  async getRecognitionHistory(params: { page?: number; limit?: number; status?: string; timeRange?: string }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AiRecognitionHistoryWhereInput = {};
    if (params.status) where.status = params.status;

    // 默认只显示7天内的记录
    if (params.timeRange === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      where.createdAt = { gte: start } as any;
    } else if (params.timeRange === 'all') {
      // 不限时间
    } else {
      // 默认：最近7天
      const start = new Date(); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
      where.createdAt = { gte: start } as any;
    }

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
    const record = await this.prisma.aiRecognitionHistory.findUnique({ where: { id } });
    if (record?.imageUrl) {
      const filePath = require('path').join(process.cwd(), record.imageUrl);
      try { fs.promises.unlink(filePath); } catch { /* 文件不存在则忽略 */ }
    }
    return this.prisma.aiRecognitionHistory.delete({ where: { id } });
  }

  async batchDeleteRecognitionHistory(ids: number[]) {
    // 删除关联的图片文件
    const records = await this.prisma.aiRecognitionHistory.findMany({ where: { id: { in: ids } } });
    const path = require('path');
    for (const r of records) {
      if (r.imageUrl) {
        const fp = path.join(process.cwd(), r.imageUrl);
        try { fs.promises.unlink(fp); } catch { /* skip */ }
      }
    }
    return this.prisma.aiRecognitionHistory.deleteMany({ where: { id: { in: ids } } });
  }

  /** 清理7天前的识别历史（定时任务） */
  async cleanupOldHistory() {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);

      const oldRecords = await this.prisma.aiRecognitionHistory.findMany({
        where: { createdAt: { lt: cutoff } },
        select: { id: true, imageUrl: true },
      });

      if (oldRecords.length === 0) return;

      const path = require('path');
      for (const r of oldRecords) {
        if (r.imageUrl) {
          const fp = path.join(process.cwd(), r.imageUrl);
          try { fs.promises.unlink(fp); } catch { /* skip */ }
        }
      }

      await this.prisma.aiRecognitionHistory.deleteMany({
        where: { id: { in: oldRecords.map(r => r.id) } },
      });

      this.logger.log(`清理了 ${oldRecords.length} 条7天前的识别历史`);
    } catch (error) {
      this.logger.error('定时清理识别历史失败:', error);
    }
  }
}
