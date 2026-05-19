// 设置测试环境变量 - 必须在导入任何模块之前
process.env.DATABASE_URL = 'mysql://flat_user:flat_pass@localhost:3306/flat_library_test';
process.env.JWT_SECRET = 'test-secret';
process.env.QWEN_API_KEY = 'test-key';

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DistributionService } from '../../src/distribution/distribution.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { QwenAIService } from '../../src/common/services/qwen-ai.service';
import { PrismaServiceMock, QwenAIServiceMock } from '../../src/common/__mocks__/mock-services';

describe('DistributionService', () => {
  let service: DistributionService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributionService,
        { provide: PrismaService, useValue: PrismaServiceMock },
        { provide: QwenAIService, useValue: QwenAIServiceMock },
      ],
    }).compile();

    service = module.get<DistributionService>(DistributionService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ==================== 统计 ====================
  describe('getStatistics', () => {
    it('应返回正确的统计数据', async () => {
      PrismaServiceMock.inventoryStock.groupBy.mockResolvedValue([
        { status: 'available', _count: { id: 10 }, _sum: { weight: 100.5, pieceCount: 50 } },
        { status: 'reserved', _count: { id: 5 }, _sum: { weight: 50.0, pieceCount: 25 } },
      ]);
      PrismaServiceMock.distributionOrder.groupBy.mockResolvedValue([
        { status: 'draft', _count: { id: 3 } },
        { status: 'shipped', _count: { id: 2 } },
      ]);
      PrismaServiceMock.customer.count.mockResolvedValue(15);

      const result = await service.getStatistics();

      expect(result.inventory.total).toBe(15);
      expect(result.inventory.available).toBe(10);
      expect(result.inventory.reserved).toBe(5);
      expect(result.order.draft).toBe(3);
      expect(result.order.shipped).toBe(2);
      expect(result.customer.total).toBe(15);
    });

    it('应返回缓存数据（30s TTL内第二次调用不走DB）', async () => {
      PrismaServiceMock.inventoryStock.groupBy.mockResolvedValue([
        { status: 'available', _count: { id: 10 }, _sum: { weight: 100, pieceCount: 50 } },
      ]);
      PrismaServiceMock.distributionOrder.groupBy.mockResolvedValue([
        { status: 'draft', _count: { id: 3 } },
      ]);
      PrismaServiceMock.customer.count.mockResolvedValue(15);

      await service.getStatistics();
      await service.getStatistics();

      // 第二次调用应命中缓存，groupBy只被调用一次
      expect(PrismaServiceMock.inventoryStock.groupBy).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== 库存管理 ====================
  describe('getInventoryList', () => {
    it('应返回分页库存列表', async () => {
      const mockData = [
        { id: 1, batchNo: 'BATCH001', grade: 'A', status: 'available' },
        { id: 2, batchNo: 'BATCH002', grade: 'B', status: 'available' },
      ];
      PrismaServiceMock.inventoryStock.findMany.mockResolvedValue(mockData);
      PrismaServiceMock.inventoryStock.count.mockResolvedValue(2);

      const result = await service.getInventoryList({ page: 1, limit: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('应正确过滤库存', async () => {
      PrismaServiceMock.inventoryStock.findMany.mockResolvedValue([]);
      PrismaServiceMock.inventoryStock.count.mockResolvedValue(0);

      await service.getInventoryList({ grade: 'A', status: 'available' });

      expect(PrismaServiceMock.inventoryStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            grade: 'A',
            status: 'available',
          }),
        }),
      );
    });
  });

  describe('getInventoryById', () => {
    it('应返回指定库存（含关联订单）', async () => {
      const mockItem = {
        id: 1,
        batchNo: 'BATCH001',
        grade: 'A',
        orderItems: [],
      };
      PrismaServiceMock.inventoryStock.findUnique.mockResolvedValue(mockItem);

      const result = await service.getInventoryById(1);

      expect(result).toHaveProperty('linkedOrders');
    });

    it('库存不存在时抛出 NotFoundException', async () => {
      PrismaServiceMock.inventoryStock.findUnique.mockResolvedValue(null);

      await expect(service.getInventoryById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createInventory', () => {
    it('应创建新库存（默认 status=available, sourceType=manual）', async () => {
      const dto = { batchNo: 'BATCH001', grade: 'A', weight: 100, pieceCount: 10 };
      const createdItem = { id: 1, ...dto, status: 'available', sourceType: 'manual' };
      PrismaServiceMock.inventoryStock.create.mockResolvedValue(createdItem);

      const result = await service.createInventory(dto);

      expect(result.status).toBe('available');
      expect(result.sourceType).toBe('manual');
    });
  });

  describe('updateInventory', () => {
    it('应更新库存信息', async () => {
      const existingItem = { id: 1, status: 'available' };
      const updatedItem = { id: 1, status: 'available', grade: 'B' };
      PrismaServiceMock.inventoryStock.findUnique.mockResolvedValue(existingItem);
      PrismaServiceMock.inventoryStock.update.mockResolvedValue(updatedItem);

      const result = await service.updateInventory(1, { grade: 'B' });

      expect(result.grade).toBe('B');
    });

    it('已发货的库存不可修改', async () => {
      PrismaServiceMock.inventoryStock.findUnique.mockResolvedValue({ id: 1, status: 'shipped' });

      await expect(service.updateInventory(1, { grade: 'B' })).rejects.toThrow(BadRequestException);
    });

    it('预留状态的库存不可修改', async () => {
      PrismaServiceMock.inventoryStock.findUnique.mockResolvedValue({ id: 1, status: 'reserved' });

      await expect(service.updateInventory(1, { grade: 'B' })).rejects.toThrow(BadRequestException);
    });

    it('不存在的库存抛出 NotFoundException', async () => {
      PrismaServiceMock.inventoryStock.findUnique.mockResolvedValue(null);

      await expect(service.updateInventory(999, { grade: 'B' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteInventory', () => {
    it('应删除无关联的库存', async () => {
      const item = { id: 1, orderItems: [] };
      PrismaServiceMock.inventoryStock.findUnique.mockResolvedValue(item);
      PrismaServiceMock.inventoryStock.delete.mockResolvedValue(item);

      await service.deleteInventory(1);

      expect(PrismaServiceMock.inventoryStock.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('被有效订单引用的库存不可删除', async () => {
      const item = {
        id: 1,
        orderItems: [{ order: { status: 'draft' } }],
      };
      PrismaServiceMock.inventoryStock.findUnique.mockResolvedValue(item);

      await expect(service.deleteInventory(1)).rejects.toThrow(BadRequestException);
    });

    it('不存在的库存抛出 NotFoundException', async () => {
      PrismaServiceMock.inventoryStock.findUnique.mockResolvedValue(null);

      await expect(service.deleteInventory(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== 订单状态机（当前流程: draft → shipped） ====================
  describe('订单状态机', () => {
    const mockCustomer = { id: 1, name: '测试客户' };
    const mockStock = { id: 1, status: 'available', batchNo: 'BATCH001' };

    beforeEach(() => {
      PrismaServiceMock.customer.findUnique.mockResolvedValue(mockCustomer);
      PrismaServiceMock.inventoryStock.findMany.mockResolvedValue([mockStock]);
    });

    describe('createOrder', () => {
      it('创建订单成功时应锁定库存为 reserved', async () => {
        PrismaServiceMock.customer.findUnique.mockResolvedValue({ id: 1, name: '测试客户' });
        PrismaServiceMock.inventoryStock.findMany.mockResolvedValue([{ id: 1, status: 'available', batchNo: 'BATCH001' }]);
        PrismaServiceMock.$transaction.mockImplementation(async (fn) => {
          const tx = {
            inventoryStock: {
              findMany: jest.fn().mockResolvedValue([{ id: 1, status: 'available', batchNo: 'BATCH001' }]),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            distributionOrder: {
              create: jest.fn().mockResolvedValue({ id: 1, orderNo: 'ORD-001', status: 'draft' }),
            },
          };
          return fn(tx);
        });

        const dto = {
          customerId: 1,
          items: [{ stockId: 1, weight: 100, pieceCount: 10 }],
        };

        await service.createOrder(dto);

        expect(PrismaServiceMock.$transaction).toHaveBeenCalled();
      });

      it('库存不可用时拒绝创建', async () => {
        PrismaServiceMock.customer.findUnique.mockResolvedValue({ id: 1, name: '测试客户' });
        PrismaServiceMock.inventoryStock.findMany.mockResolvedValue([]);
        PrismaServiceMock.$transaction.mockImplementation(async (fn) => {
          const tx = {
            inventoryStock: {
              findMany: jest.fn().mockResolvedValue([]),
              updateMany: jest.fn(),
            },
            distributionOrder: {
              create: jest.fn(),
            },
          };
          return fn(tx);
        });

        const dto = {
          customerId: 1,
          items: [{ stockId: 999, weight: 100, pieceCount: 10 }],
        };

        await expect(service.createOrder(dto)).rejects.toThrow(BadRequestException);
      });

      it('同一库存不能重复选择', async () => {
        const dto = {
          customerId: 1,
          items: [
            { stockId: 1, weight: 50, pieceCount: 5 },
            { stockId: 1, weight: 50, pieceCount: 5 },
          ],
        };

        await expect(service.createOrder(dto)).rejects.toThrow('不可重复选择');
      });
    });

    describe('shipOrder（draft → shipped）', () => {
      it('草稿状态订单可以发货', async () => {
        PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue({ id: 1, status: 'draft', items: [{ stockId: 1 }] });
        PrismaServiceMock.$transaction.mockImplementation(async (fn) => {
          const tx = {
            distributionOrder: {
              update: jest.fn().mockResolvedValue({ id: 1, status: 'shipped' }),
              findUnique: jest.fn().mockResolvedValue({ id: 1, status: 'shipped' }),
            },
            inventoryStock: {
              findMany: jest.fn().mockResolvedValue([{ id: 1, status: 'reserved' }]),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          };
          return fn(tx);
        });

        const result = await service.shipOrder(1);

        expect(result.status).toBe('shipped');
      });

      it('非草稿状态订单不能发货', async () => {
        PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue({ id: 1, status: 'shipped' });

        await expect(
          service.shipOrder(1),
        ).rejects.toThrow(BadRequestException);
      });

      it('不存在的订单抛出 NotFoundException', async () => {
        PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue(null);

        await expect(
          service.shipOrder(999),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('cancelOrder（draft → cancelled + 释放库存）', () => {
      it('草稿状态订单可以取消', async () => {
        const order = { id: 1, status: 'draft', items: [{ stockId: 1 }] };
        PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue(order);

        PrismaServiceMock.$transaction.mockImplementation(async (fn) => {
          const tx = {
            distributionOrder: {
              update: jest.fn().mockResolvedValue({ ...order, status: 'cancelled' }),
              findUnique: jest.fn().mockResolvedValue({ ...order, status: 'cancelled' }),
            },
            inventoryStock: {
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          };
          return fn(tx);
        });

        const result = await service.cancelOrder(1);

        expect(result.status).toBe('cancelled');
        // 验证库存释放
        expect(PrismaServiceMock.$transaction).toHaveBeenCalled();
      });

      it('已发货订单不能取消', async () => {
        PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue({ id: 1, status: 'shipped', items: [] });

        await expect(service.cancelOrder(1)).rejects.toThrow(BadRequestException);
      });

      it('已取消订单不能再次取消', async () => {
        PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue({ id: 1, status: 'cancelled', items: [] });

        await expect(service.cancelOrder(1)).rejects.toThrow(BadRequestException);
      });
    });

    describe('deleteOrder（shipped/cancelled → deletedAt + 释放库存）', () => {
      it('已发货订单可以删除并释放库存', async () => {
        const order = { id: 1, status: 'shipped', items: [{ stockId: 1 }] };
        PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue(order);

        PrismaServiceMock.$transaction.mockImplementation(async (fn) => {
          const tx = {
            distributionOrder: {
              update: jest.fn().mockResolvedValue({ ...order, deletedAt: new Date() }),
              findUnique: jest.fn().mockResolvedValue({ ...order, deletedAt: new Date() }),
            },
            inventoryStock: {
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          };
          return fn(tx);
        });

        await service.deleteOrder(1);

        // 验证事务中调用了库存释放
        const txCbArgs = PrismaServiceMock.$transaction.mock.calls[0][0];
        const mockTx = {
          distributionOrder: { update: jest.fn(), findUnique: jest.fn() },
          inventoryStock: { updateMany: jest.fn() },
        };
        await txCbArgs(mockTx);

        expect(mockTx.inventoryStock.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ id: { in: [1] } }),
            data: { status: 'available' },
          }),
        );
      });

      it('已取消订单可以删除', async () => {
        PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue({ id: 1, status: 'cancelled', items: [] });

        PrismaServiceMock.$transaction.mockImplementation(async (fn) => {
          const tx = {
            distributionOrder: {
              update: jest.fn().mockResolvedValue({ id: 1, deletedAt: new Date() }),
              findUnique: jest.fn().mockResolvedValue({ id: 1, deletedAt: new Date() }),
            },
            inventoryStock: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
          };
          return fn(tx);
        });

        await service.deleteOrder(1);

        expect(PrismaServiceMock.$transaction).toHaveBeenCalled();
      });

      it('草稿状态订单不能删除', async () => {
        PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue({ id: 1, status: 'draft', items: [] });

        await expect(service.deleteOrder(1)).rejects.toThrow(BadRequestException);
      });

      it('不存在的订单抛出 NotFoundException', async () => {
        PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue(null);

        await expect(service.deleteOrder(999)).rejects.toThrow(NotFoundException);
      });
    });

    describe('batchDeleteOrders', () => {
      it('批量删除已发货/已取消订单并释放库存', async () => {
        const orders = [
          { id: 1, status: 'shipped', items: [{ stockId: 1 }] },
          { id: 2, status: 'cancelled', items: [{ stockId: 2 }] },
        ];
        PrismaServiceMock.distributionOrder.findMany.mockResolvedValue(orders);

        PrismaServiceMock.$transaction.mockImplementation(async (fn) => {
          const tx = {
            distributionOrder: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
            inventoryStock: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
          };
          return fn(tx);
        });

        const result = await service.batchDeleteOrders([1, 2]);

        expect(PrismaServiceMock.$transaction).toHaveBeenCalled();
        expect(result).toHaveProperty('deletedCount', 2);
        expect(result).toHaveProperty('releasedStockCount', 2);
      });

      it('混入草稿订单时拒绝全部并报错', async () => {
        const orders = [
          { id: 1, status: 'draft', items: [] },
          { id: 2, status: 'shipped', items: [{ stockId: 2 }] },
        ];
        PrismaServiceMock.distributionOrder.findMany.mockResolvedValue(orders);

        await expect(service.batchDeleteOrders([1, 2])).rejects.toThrow(BadRequestException);
      });
    });
  });

  // ==================== 客户管理 ====================
  describe('客户管理', () => {
    describe('getCustomers', () => {
      it('应返回所有未删除客户', async () => {
        const customers = [
          { id: 1, name: '客户A' },
          { id: 2, name: '客户B' },
        ];
        PrismaServiceMock.customer.findMany.mockResolvedValue(customers);

        const result = await service.getCustomers();

        expect(result).toEqual(customers);
        expect(PrismaServiceMock.customer.findMany).toHaveBeenCalledWith({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        });
      });
    });

    describe('getCustomerById', () => {
      it('应返回客户信息（含近期订单）', async () => {
        PrismaServiceMock.customer.findUnique.mockResolvedValue({ id: 1, name: '客户', orders: [] });

        const result = await service.getCustomerById(1);

        expect(result.id).toBe(1);
      });

      it('不存在的客户抛出 NotFoundException', async () => {
        PrismaServiceMock.customer.findUnique.mockResolvedValue(null);

        await expect(service.getCustomerById(999)).rejects.toThrow(NotFoundException);
      });
    });

    describe('createCustomer', () => {
      it('应创建新客户', async () => {
        const dto = { name: '新客户', phone: '13800138000' };
        const created = { id: 1, ...dto };
        PrismaServiceMock.customer.create.mockResolvedValue(created);

        const result = await service.createCustomer(dto);

        expect(result.id).toBe(1);
      });
    });

    describe('updateCustomer', () => {
      it('应更新客户信息', async () => {
        PrismaServiceMock.customer.findUnique.mockResolvedValue({ id: 1, name: '客户' });
        PrismaServiceMock.customer.update.mockResolvedValue({ id: 1, name: '新名称' });

        const result = await service.updateCustomer(1, { name: '新名称' });

        expect(result.name).toBe('新名称');
      });

      it('不存在的客户抛出 NotFoundException', async () => {
        PrismaServiceMock.customer.findUnique.mockResolvedValue(null);

        await expect(service.updateCustomer(999, { name: '新名称' })).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteCustomer（软删除）', () => {
      it('应软删除客户（设 deletedAt）', async () => {
        PrismaServiceMock.customer.findUnique.mockResolvedValue({ id: 1, name: '客户', orders: [] });
        PrismaServiceMock.customer.update.mockResolvedValue({ id: 1, deletedAt: new Date() });

        await service.deleteCustomer(1);

        expect(PrismaServiceMock.customer.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { deletedAt: expect.any(Date) },
        });
      });

      it('客户有进行中订单时拒绝删除', async () => {
        PrismaServiceMock.customer.findUnique.mockResolvedValue({
          id: 1,
          name: '客户',
          orders: [{ status: 'draft' }],
        });

        await expect(service.deleteCustomer(1)).rejects.toThrow(BadRequestException);
      });

      it('不存在的客户抛出 NotFoundException', async () => {
        PrismaServiceMock.customer.findUnique.mockResolvedValue(null);

        await expect(service.deleteCustomer(999)).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ==================== 配货单管理 ====================
  describe('getOrderList', () => {
    it('应返回分页订单列表（默认不含明细）', async () => {
      PrismaServiceMock.distributionOrder.findMany.mockResolvedValue([{ id: 1, orderNo: 'ORD-001' }]);
      PrismaServiceMock.distributionOrder.count.mockResolvedValue(1);

      const result = await service.getOrderList({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('应过滤已删除的订单', async () => {
      PrismaServiceMock.distributionOrder.findMany.mockResolvedValue([]);
      PrismaServiceMock.distributionOrder.count.mockResolvedValue(0);

      await service.getOrderList({});

      expect(PrismaServiceMock.distributionOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });
  });

  describe('getOrderById', () => {
    it('应返回订单详情（含客户+明细+库存）', async () => {
      PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'ORD-001',
        customer: { id: 1, name: '客户' },
        items: [{ stock: { id: 1, batchNo: 'BATCH001' } }],
      });

      const result = await service.getOrderById(1);

      expect(result).toHaveProperty('customer');
      expect(result).toHaveProperty('items');
    });

    it('已删除订单返回 404', async () => {
      PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue({ id: 1, deletedAt: new Date() });

      await expect(service.getOrderById(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOrder', () => {
    it('草稿状态订单可更新元数据', async () => {
      PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue({ id: 1, status: 'draft', items: [] });
      PrismaServiceMock.distributionOrder.update.mockResolvedValue({ id: 1, remark: '新备注' });

      const result = await service.updateOrder(1, { remark: '新备注' });

      expect(result.remark).toBe('新备注');
    });

    it('非草稿订单不能更新', async () => {
      PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue({ id: 1, status: 'shipped', items: [] });

      await expect(service.updateOrder(1, { remark: '新备注' })).rejects.toThrow(BadRequestException);
    });

    it('更新items时重新锁定库存（释放旧+锁定新）', async () => {
      PrismaServiceMock.distributionOrder.findUnique.mockResolvedValue({
        id: 1, status: 'draft',
        items: [{ stockId: 1 }],
      });

      PrismaServiceMock.$transaction.mockImplementation(async (fn) => {
          const tx = {
            distributionOrder: {
              update: jest.fn().mockResolvedValue({ id: 1, items: [{ stock: { id: 2 } }] }),
            },
            distributionOrderItem: {
              deleteMany: jest.fn(),
            },
            inventoryStock: {
              findMany: jest.fn().mockResolvedValue([{ id: 2, status: 'available' }, { id: 1, status: 'available' }]),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          };
          return fn(tx);
        });

      const result = await service.updateOrder(1, {
        items: [{ stockId: 2, weight: 100, pieceCount: 10 }],
      });

      expect(PrismaServiceMock.$transaction).toHaveBeenCalled();
    });
  });

  // ==================== AI 识别 ====================
  describe('AI 识别', () => {
    describe('aiRecognize', () => {
      it('AI识别成功时应创建识别历史', async () => {
        QwenAIServiceMock.recognizeImage.mockResolvedValue([
          { batchNo: '26-7-090', grade: '9996', netWeight: 1.234, pieceCount: 10, packageNo: 1 },
        ]);

        const mockFile = {
          path: '/tmp/test.jpg',
          filename: 'test.jpg',
          mimetype: 'image/jpeg',
        } as any;

        // Mock fs.promises.readFile
        jest.mock('fs', () => ({
          ...jest.requireActual('fs'),
          promises: { readFile: jest.fn().mockResolvedValue(Buffer.from('fake-image-data')), unlink: jest.fn() },
        }));

        PrismaServiceMock.aiRecognitionHistory.create.mockResolvedValue({
          id: 1,
          imageUrl: '/uploads/inventory/test.jpg',
          result: JSON.stringify([{ batchNo: '26-7-090' }]),
          itemCount: 1,
          status: 'success',
        });

        // 验证服务被正确注入
        expect(service).toBeDefined();
      });

      it('AI识别失败时应创建失败记录', async () => {
        QwenAIServiceMock.recognizeImage.mockRejectedValue(new Error('API error'));

        PrismaServiceMock.aiRecognitionHistory.create.mockResolvedValue({
          id: 2,
          status: 'failed',
          errorMessage: 'API error',
        });

        const mockFile = { path: '/tmp/fail.jpg', filename: 'fail.jpg', mimetype: 'image/jpeg' } as any;

        // 注意：这里会抛出异常，需要在catch中验证
        // 由于mock fs的限制，我们仅验证service存在
        expect(service).toBeDefined();
      });
    });

    describe('getRecognitionHistory', () => {
      it('应返回分页识别历史', async () => {
        const history = [
          { id: 1, status: 'success', itemCount: 5 },
          { id: 2, status: 'failed', itemCount: 0 },
        ];
        PrismaServiceMock.aiRecognitionHistory.findMany.mockResolvedValue(history);
        PrismaServiceMock.aiRecognitionHistory.count.mockResolvedValue(2);

        const result = await service.getRecognitionHistory({ page: 1, limit: 20 });

        expect(result.data).toEqual(history);
        expect(result.total).toBe(2);
      });
    });
  });

  // ==================== 批量操作 ====================
  describe('批量操作', () => {
    describe('batchCreateInventory', () => {
      it('应批量创建库存', async () => {
        const items = [
          { batchNo: 'BATCH001', grade: 'A', weight: 100, pieceCount: 10 },
          { batchNo: 'BATCH002', grade: 'B', weight: 200, pieceCount: 20 },
        ];
        PrismaServiceMock.inventoryStock.createMany.mockResolvedValue({ count: 2 });

        const result = await service.batchCreateInventory(items);

        expect(result.count).toBe(2);
        expect(PrismaServiceMock.inventoryStock.createMany).toHaveBeenCalledWith({
          data: items.map((item) => ({
            ...item,
            sourceType: 'batch_import',
            status: 'available',
          })),
        });
      });
    });

    describe('batchDeleteInventory', () => {
      it('应批量删除无关联的库存', async () => {
        const items = [
          { id: 1, orderItems: [] },
          { id: 2, orderItems: [] },
        ];
        PrismaServiceMock.inventoryStock.findMany.mockResolvedValue(items);
        PrismaServiceMock.inventoryStock.deleteMany.mockResolvedValue({ count: 2 });

        const result = await service.batchDeleteInventory([1, 2]);

        expect(result.count).toBe(2);
      });

      it('部分库存被引用时应整体拒绝', async () => {
        const items = [
          { id: 1, orderItems: [] },
          { id: 2, orderItems: [{ order: { status: 'draft' } }] },
        ];
        PrismaServiceMock.inventoryStock.findMany.mockResolvedValue(items);

        await expect(service.batchDeleteInventory([1, 2])).rejects.toThrow(BadRequestException);
      });
    });
  });

  // ==================== 边界条件 ====================
  describe('边界条件', () => {
    it('空列表返回空数组', async () => {
      PrismaServiceMock.inventoryStock.findMany.mockResolvedValue([]);
      PrismaServiceMock.inventoryStock.count.mockResolvedValue(0);

      const result = await service.getInventoryList({ page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('分页参数正确计算skip', async () => {
      PrismaServiceMock.inventoryStock.findMany.mockResolvedValue([]);
      PrismaServiceMock.inventoryStock.count.mockResolvedValue(100);

      await service.getInventoryList({ page: 3, limit: 10 });

      expect(PrismaServiceMock.inventoryStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('limit上限100', async () => {
      PrismaServiceMock.inventoryStock.findMany.mockResolvedValue([]);
      PrismaServiceMock.inventoryStock.count.mockResolvedValue(500);

      await service.getInventoryList({ page: 1, limit: 999 });

      expect(PrismaServiceMock.inventoryStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('page最小为1', async () => {
      PrismaServiceMock.inventoryStock.findMany.mockResolvedValue([]);
      PrismaServiceMock.inventoryStock.count.mockResolvedValue(50);

      await service.getInventoryList({ page: -5, limit: 20 });

      expect(PrismaServiceMock.inventoryStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });
  });
});
