import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('DistributionController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // 清理测试数据
    await prisma.distributionOrderItem.deleteMany({});
    await prisma.distributionOrder.deleteMany({});
    await prisma.inventoryStock.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.aiRecognitionHistory.deleteMany({});
  });

  // ==================== 统计 API ====================
  describe('/distribution/statistics (GET)', () => {
    it('应返回统计数据', async () => {
      const response = await request(app.getHttpServer())
        .get('/distribution/statistics')
        .expect(200);

      expect(response.body).toHaveProperty('inventory');
      expect(response.body).toHaveProperty('order');
      expect(response.body).toHaveProperty('customer');
    });
  });

  // ==================== 库存 API ====================
  describe('/distribution/inventory (CRUD)', () => {
    it('GET /distribution/inventory - 应返回空列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/distribution/inventory')
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('POST /distribution/inventory - 应创建库存', async () => {
      const createDto = {
        batchNo: 'BATCH001',
        grade: 'A',
        weight: 100,
        pieceCount: 10,
        location: 'A区',
      };

      const response = await request(app.getHttpServer())
        .post('/distribution/inventory')
        .send(createDto)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.batchNo).toBe('BATCH001');
      expect(response.body.status).toBe('available');
    });

    it('POST /distribution/inventory/batch - 应批量创建库存', async () => {
      const items = [
        { batchNo: 'BATCH001', grade: 'A', weight: 100, pieceCount: 10 },
        { batchNo: 'BATCH002', grade: 'B', weight: 200, pieceCount: 20 },
      ];

      const response = await request(app.getHttpServer())
        .post('/distribution/inventory/batch')
        .send(items)
        .expect(201);

      expect(response.body.count).toBe(2);
    });

    it('PATCH /distribution/inventory/:id - 应更新库存', async () => {
      // 先创建
      const created = await prisma.inventoryStock.create({
        data: { batchNo: 'BATCH001', grade: 'A', weight: 100, pieceCount: 10 },
      });

      const response = await request(app.getHttpServer())
        .patch(`/distribution/inventory/${created.id}`)
        .send({ grade: 'B', weight: 100, pieceCount: 10 })
        .expect(200);

      expect(response.body.grade).toBe('B');
    });

    it('DELETE /distribution/inventory/:id - 应删除库存', async () => {
      const created = await prisma.inventoryStock.create({
        data: { batchNo: 'BATCH001', grade: 'A', weight: 100, pieceCount: 10 },
      });

      await request(app.getHttpServer())
        .delete(`/distribution/inventory/${created.id}`)
        .expect(200);

      const deleted = await prisma.inventoryStock.findUnique({ where: { id: created.id } });
      expect(deleted).toBeNull();
    });

    it('GET /distribution/inventory/:id - 应返回单条库存', async () => {
      const created = await prisma.inventoryStock.create({
        data: { batchNo: 'BATCH001', grade: 'A', weight: 100, pieceCount: 10 },
      });

      const response = await request(app.getHttpServer())
        .get(`/distribution/inventory/${created.id}`)
        .expect(200);

      expect(response.body.id).toBe(created.id);
    });

    it('GET /distribution/inventory/:id - 不存在应返回404', async () => {
      await request(app.getHttpServer())
        .get('/distribution/inventory/99999')
        .expect(404);
    });

    it('POST /distribution/inventory/batch-delete - 应批量删除库存', async () => {
      const item1 = await prisma.inventoryStock.create({
        data: { batchNo: 'BATCH001', grade: 'A', weight: 100, pieceCount: 10 },
      });
      const item2 = await prisma.inventoryStock.create({
        data: { batchNo: 'BATCH002', grade: 'B', weight: 200, pieceCount: 20 },
      });

      const response = await request(app.getHttpServer())
        .post('/distribution/inventory/batch-delete')
        .send({ ids: [item1.id, item2.id] })
        .expect(201);

      expect(response.body.count).toBe(2);
    });
  });

  // ==================== 客户 API ====================
  describe('/distribution/customers (CRUD)', () => {
    it('GET /distribution/customers - 应返回客户列表', async () => {
      await prisma.customer.create({ data: { name: '客户A', phone: '13800138000' } });
      await prisma.customer.create({ data: { name: '客户B', phone: '13800138001' } });

      const response = await request(app.getHttpServer())
        .get('/distribution/customers')
        .expect(200);

      expect(response.body.length).toBe(2);
    });

    it('POST /distribution/customers - 应创建客户', async () => {
      const createDto = { name: '新客户', phone: '13800138000', address: '北京市' };

      const response = await request(app.getHttpServer())
        .post('/distribution/customers')
        .send(createDto)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('新客户');
    });

    it('PUT /distribution/customers/:id - 应更新客户', async () => {
      const created = await prisma.customer.create({ data: { name: '客户' } });

      const response = await request(app.getHttpServer())
        .put(`/distribution/customers/${created.id}`)
        .send({ name: '更新后客户' })
        .expect(200);

      expect(response.body.name).toBe('更新后客户');
    });

    it('DELETE /distribution/customers/:id - 应软删除客户', async () => {
      const created = await prisma.customer.create({ data: { name: '客户' } });

      await request(app.getHttpServer())
        .delete(`/distribution/customers/${created.id}`)
        .expect(200);

      const deleted = await prisma.customer.findUnique({
        where: { id: created.id },
        select: { deletedAt: true },
      });
      expect(deleted.deletedAt).toBeDefined();
    });

    it('GET /distribution/customers/:id - 应返回单个客户及订单', async () => {
      const customer = await prisma.customer.create({ data: { name: '客户' } });

      const response = await request(app.getHttpServer())
        .get(`/distribution/customers/${customer.id}`)
        .expect(200);

      expect(response.body.id).toBe(customer.id);
      expect(response.body.orders).toBeDefined();
    });
  });

  // ==================== 订单 API ====================
  describe('/distribution/orders (CRUD)', () => {
    let testCustomer: any;
    let testStock: any;

    beforeEach(async () => {
      testCustomer = await prisma.customer.create({ data: { name: '测试客户' } });
      testStock = await prisma.inventoryStock.create({
        data: { batchNo: 'BATCH001', grade: 'A', weight: 100, pieceCount: 10 },
      });
    });

    it('GET /distribution/orders - 应返回订单列表', async () => {
      await prisma.distributionOrder.create({
        data: {
          orderNo: 'ORD-001',
          customerId: testCustomer.id,
          status: 'draft',
        },
      });

      const response = await request(app.getHttpServer())
        .get('/distribution/orders')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.total).toBe(1);
    });

    it('POST /distribution/orders - 应创建订单并锁定库存', async () => {
      const createDto = {
        customerId: testCustomer.id,
        items: [{ stockId: testStock.id, weight: 100, pieceCount: 10 }],
      };

      const response = await request(app.getHttpServer())
        .post('/distribution/orders')
        .send(createDto)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('draft');

      // 验证库存已锁定
      const stock = await prisma.inventoryStock.findUnique({ where: { id: testStock.id } });
      expect(stock.status).toBe('reserved');
    });

    it('POST /distribution/orders/:id/ship - 应发货', async () => {
      const order = await prisma.distributionOrder.create({
        data: {
          orderNo: 'ORD-001',
          customerId: testCustomer.id,
          status: 'draft',
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/distribution/orders/${order.id}/ship`)
        .send({ driverName: '张三', vehicleNo: '京A12345' })
        .expect(201);

      expect(response.body.status).toBe('shipping');
      expect(response.body.driverName).toBe('张三');
    });

    it('POST /distribution/orders/:id/deliver - 应完成发运', async () => {
      const order = await prisma.distributionOrder.create({
        data: {
          orderNo: 'ORD-001',
          customerId: testCustomer.id,
          status: 'shipping',
          items: {
            create: { stockId: testStock.id, weight: 100, pieceCount: 10 },
          },
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/distribution/orders/${order.id}/deliver`)
        .expect(201);

      expect(response.body.status).toBe('shipped');

      // 验证库存已发货
      const stock = await prisma.inventoryStock.findUnique({ where: { id: testStock.id } });
      expect(stock.status).toBe('shipped');
    });

    it('POST /distribution/orders/:id/cancel - 应取消订单并释放库存', async () => {
      const order = await prisma.distributionOrder.create({
        data: {
          orderNo: 'ORD-001',
          customerId: testCustomer.id,
          status: 'draft',
          items: {
            create: { stockId: testStock.id, weight: 100, pieceCount: 10 },
          },
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/distribution/orders/${order.id}/cancel`)
        .expect(201);

      expect(response.body.status).toBe('cancelled');

      // 验证库存已释放
      const stock = await prisma.inventoryStock.findUnique({ where: { id: testStock.id } });
      expect(stock.status).toBe('available');
    });

    it('DELETE /distribution/orders/:id - 应删除已完成订单', async () => {
      const order = await prisma.distributionOrder.create({
        data: {
          orderNo: 'ORD-001',
          customerId: testCustomer.id,
          status: 'shipped',
        },
      });

      await request(app.getHttpServer())
        .delete(`/distribution/orders/${order.id}`)
        .expect(200);

      const deleted = await prisma.distributionOrder.findUnique({
        where: { id: order.id },
        select: { deletedAt: true },
      });
      expect(deleted.deletedAt).toBeDefined();
    });

    it('POST /distribution/orders/batch-delete - 应批量删除订单', async () => {
      const order1 = await prisma.distributionOrder.create({
        data: { orderNo: 'ORD-001', customerId: testCustomer.id, status: 'shipped' },
      });
      const order2 = await prisma.distributionOrder.create({
        data: { orderNo: 'ORD-002', customerId: testCustomer.id, status: 'cancelled' },
      });

      await request(app.getHttpServer())
        .post('/distribution/orders/batch-delete')
        .send({ ids: [order1.id, order2.id] })
        .expect(201);

      // Verify deletion was successful
      const deleted1 = await prisma.distributionOrder.findUnique({ where: { id: order1.id } });
      expect(deleted1.deletedAt).toBeDefined();
    });
  });

  // ==================== 边界测试 ====================
  describe('边界测试', () => {
    it('库存状态为 shipped 时不可修改', async () => {
      const stock = await prisma.inventoryStock.create({
        data: { batchNo: 'BATCH001', grade: 'A', weight: 100, pieceCount: 10, status: 'shipped' },
      });

      await request(app.getHttpServer())
        .patch(`/distribution/inventory/${stock.id}`)
        .send({ grade: 'B' })
        .expect(400);
    });

    it('使用无效的库存ID创建订单应返回400', async () => {
      const customer = await prisma.customer.create({ data: { name: '客户' } });

      await request(app.getHttpServer())
        .post('/distribution/orders')
        .send({
          customerId: customer.id,
          items: [{ stockId: 99999, weight: 100, pieceCount: 10 }],
        })
        .expect(400);
    });

    it('非草稿订单不能确认', async () => {
      const customer = await prisma.customer.create({ data: { name: '客户' } });
      const order = await prisma.distributionOrder.create({
        data: { orderNo: 'ORD-001', customerId: customer.id, status: 'shipped' },
      });

      await request(app.getHttpServer())
        .post(`/distribution/orders/${order.id}/confirm`)
        .expect(400);
    });
  });
});
