/**
 * 端到端测试脚本
 * 运行: node backend/test-e2e.js
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3002';
let token = '';
let testResults = [];

// 颜色输出
const green = (msg) => console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
const red = (msg) => console.log(`\x1b[31m✗ ${msg}\x1b[0m`);
const yellow = (msg) => console.log(`\x1b[33m⚠ ${msg}\x1b[0m`);
const info = (msg) => console.log(`  ${msg}`);

// 创建请求实例
const request = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// 添加请求拦截器
request.interceptors.request.use((config) => {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    info(`[请求拦截] 添加 Token: ${token.substring(0, 20)}...`);
  } else {
    info('[请求拦截] 无 Token');
  }
  return config;
});

// 响应拦截器 - 解包 response.data
request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 记录测试结果
function recordTest(module, name, passed, error = null) {
  testResults.push({ module, name, passed, error });
  if (passed) {
    green(`${module}: ${name}`);
  } else {
    red(`${module}: ${name}`);
    if (error) info(`  错误: ${error.message || error}`);
  }
}

// ==================== 测试模块 ====================

async function testAuth() {
  console.log('\n========== 认证模块测试 ==========');

  // 1. 登录
  try {
    const res = await request.post('/auth/login', {
      username: 'admin',
      password: 'admin123',
    });
    info(`[登录响应] access_token: ${res.access_token ? '存在' : '不存在'}`);
    token = res.access_token;
    info(`[Token赋值] ${token ? '成功 (长度:' + token.length + ')' : '失败'}`);
  } catch (err) {
    recordTest('🔐 认证', '登录', false, err);
    return false;
  }

  // 2. 获取用户信息
  try {
    await request.get('/auth/profile');
    recordTest('🔐 认证', '获取用户信息', true);
  } catch (err) {
    recordTest('🔐 认证', '获取用户信息', false, err);
  }

  // 3. 注册新用户
  try {
    const username = `testuser_${Date.now()}`;
    await request.post('/auth/register', {
      username,
      password: 'test123456',
    });
    recordTest('🔐 认证', '用户注册', true);
  } catch (err) {
    recordTest('🔐 认证', '用户注册', false, err);
  }

  return true;
}

async function testStatistics() {
  console.log('\n========== 统计模块测试 ==========');

  try {
    const res = await request.get('/distribution/statistics');
    if (res.inventory && res.order && res.customer) {
      recordTest('📊 统计', '获取全局统计概览', true);
      info(`  库存: ${res.inventory.total} 条, 总重量: ${res.inventory.totalWeight}`);
      info(`  订单: ${res.order.total} 条`);
      info(`  客户: ${res.customer.total} 位`);
    } else {
      recordTest('📊 统计', '获取全局统计概览', false, new Error('数据结构不正确'));
    }
  } catch (err) {
    recordTest('📊 统计', '获取全局统计概览', false, err);
  }
}

let testInventoryIds = [];

async function testInventory() {
  console.log('\n========== 库存模块测试 ==========');

  // 1. 创建库存
  try {
    const res = await request.post('/distribution/inventory', {
      batchNo: `TEST-${Date.now()}`,
      grade: '9997',
      weight: 100.5,
      pieceCount: 10,
      location: '三厂区',
    });
    if (res.id) {
      testInventoryIds.push(res.id);
      recordTest('📦 库存', '创建库存', true);
      info(`  创建ID: ${res.id}, 批号: ${res.batchNo}`);
    }
  } catch (err) {
    recordTest('📦 库存', '创建库存', false, err);
  }

  // 2. 查询库存列表
  try {
    const res = await request.get('/distribution/inventory', {
      params: { page: 1, limit: 10 }
    });
    if (res.data && res.total !== undefined) {
      recordTest('📦 库存', '分页查询库存', true);
      info(`  总数: ${res.total} 条`);
    }
  } catch (err) {
    recordTest('📦 库存', '分页查询库存', false, err);
  }

  // 3. 搜索库存
  try {
    const res = await request.get('/distribution/inventory/search', {
      params: { keyword: '9997', limit: 5 }
    });
    if (Array.isArray(res)) {
      recordTest('📦 库存', '库存远程搜索', true);
      info(`  搜索到: ${res.length} 条`);
    }
  } catch (err) {
    recordTest('📦 库存', '库存远程搜索', false, err);
  }

  // 4. 更新库存
  if (testInventoryIds.length > 0) {
    try {
      await request.patch(`/distribution/inventory/${testInventoryIds[0]}`, {
        location: '二厂区',
      });
      recordTest('📦 库存', '更新库存', true);
    } catch (err) {
      recordTest('📦 库存', '更新库存', false, err);
    }
  }
}

let testCustomerId = null;

async function testCustomer() {
  console.log('\n========== 客户模块测试 ==========');

  // 1. 创建客户
  try {
    const res = await request.post('/distribution/customers', {
      name: `测试客户_${Date.now()}`,
      contact: '张三',
      phone: '13800138000',
    });
    if (res.id) {
      testCustomerId = res.id;
      recordTest('👥 客户', '创建客户', true);
      info(`  创建ID: ${res.id}`);
    }
  } catch (err) {
    recordTest('👥 客户', '创建客户', false, err);
  }

  // 2. 查询客户列表
  try {
    const res = await request.get('/distribution/customers');
    if (Array.isArray(res)) {
      recordTest('👥 客户', '查询客户列表', true);
      info(`  总数: ${res.length} 位`);
    }
  } catch (err) {
    recordTest('👥 客户', '查询客户列表', false, err);
  }

  // 3. 更新客户
  if (testCustomerId) {
    try {
      await request.put(`/distribution/customers/${testCustomerId}`, {
        remark: '测试备注',
      });
      recordTest('👥 客户', '更新客户', true);
    } catch (err) {
      recordTest('👥 客户', '更新客户', false, err);
    }
  }
}

let testOrderId = null;

async function testOrder() {
  console.log('\n========== 配货单模块测试 ==========');

  // 1. 创建订单
  if (testCustomerId && testInventoryIds.length > 0) {
    try {
      const res = await request.post('/distribution/orders', {
        customerId: testCustomerId,
        customerName: '测试客户',
        productSpec: '50*50',
        targetGrade: '9997',
        items: [
          {
            stockId: testInventoryIds[0],
            weight: 50,
            pieceCount: 5,
          },
        ],
      });
      if (res.id) {
        testOrderId = res.id;
        recordTest('📋 配货单', '创建订单', true);
        info(`  创建ID: ${res.id}, 状态: ${res.status}`);
      }
    } catch (err) {
      recordTest('📋 配货单', '创建订单', false, err);
    }
  } else {
    yellow('📋 配货单: 跳过创建（缺少客户或库存数据）');
  }

  // 2. 查询订单列表
  try {
    const res = await request.get('/distribution/orders', {
      params: { page: 1, limit: 10 }
    });
    if (res.data && res.total !== undefined) {
      recordTest('📋 配货单', '分页查询订单', true);
      info(`  总数: ${res.total} 条`);
    }
  } catch (err) {
    recordTest('📋 配货单', '分页查询订单', false, err);
  }

  // 3. 订单发货
  if (testOrderId) {
    try {
      const res = await request.post(`/distribution/orders/${testOrderId}/ship`, {
        driverName: '李司机',
        vehicleNo: '京A12345',
      });
      if (res.status === 'shipping') {
        recordTest('📋 配货单', '订单发货', true);
      }
    } catch (err) {
      recordTest('📋 配货单', '订单发货', false, err);
    }
  }

  // 4. 订单完成发运
  if (testOrderId) {
    try {
      const res = await request.post(`/distribution/orders/${testOrderId}/deliver`);
      if (res.status === 'shipped') {
        recordTest('📋 配货单', '订单完成发运', true);
      }
    } catch (err) {
      recordTest('📋 配货单', '订单完成发运', false, err);
    }
  }
}

async function testRecognitionHistory() {
  console.log('\n========== AI识别历史模块测试 ==========');

  try {
    const res = await request.get('/distribution/recognition-history', {
      params: { page: 1, limit: 10 }
    });
    if (res.data && res.total !== undefined) {
      recordTest('🤖 AI识别', '查询识别历史', true);
      info(`  总数: ${res.total} 条`);
    }
  } catch (err) {
    recordTest('🤖 AI识别', '查询识别历史', false, err);
  }
}

async function testHealth() {
  console.log('\n========== 健康检查测试 ==========');

  try {
    const res = await axios.get(`${BASE_URL}/health`);
    recordTest('🏥 健康检查', '服务健康状态', true);
    info(`  状态: ${res.data.status}`);
  } catch (err) {
    recordTest('🏥 健康检查', '服务健康状态', false, err);
  }
}

async function cleanup() {
  console.log('\n========== 清理测试数据 ==========');

  // 删除测试订单
  if (testOrderId) {
    try {
      await request.post(`/distribution/orders/${testOrderId}/cancel`);
      info(`  取消订单: ${testOrderId}`);
    } catch (err) {
      // 忽略错误
    }
  }

  // 删除测试库存
  for (const id of testInventoryIds) {
    try {
      await request.delete(`/distribution/inventory/${id}`);
      info(`  删除库存: ${id}`);
    } catch (err) {
      // 忽略错误
    }
  }
}

function printSummary() {
  console.log('\n========== 测试结果汇总 ==========');

  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;
  const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

  // 按模块统计
  const modules = {};
  testResults.forEach((r) => {
    if (!modules[r.module]) {
      modules[r.module] = { passed: 0, failed: 0 };
    }
    if (r.passed) {
      modules[r.module].passed++;
    } else {
      modules[r.module].failed++;
    }
  });

  console.log(`\n总计: ${total} 项测试`);
  console.log(`通过: ${passed} ✓`);
  console.log(`失败: ${failed} ✗`);
  console.log(`成功率: ${successRate}%`);

  console.log('\n按模块统计:');
  for (const [name, stats] of Object.entries(modules)) {
    const rate = ((stats.passed / (stats.passed + stats.failed)) * 100).toFixed(0);
    console.log(`  ${name}: ${stats.passed}/${stats.passed + stats.failed} (${rate}%)`);
  }

  // 列出失败的测试
  if (failed > 0) {
    console.log('\n失败的测试:');
    testResults
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error?.message || r.error}`);
      });
  }

  return { total, passed, failed, successRate };
}

// ==================== 主函数 ====================

async function runTests() {
  console.log('========================================');
  console.log('  平面库配货模块 - 端到端测试');
  console.log('========================================');
  console.log(`\n测试地址: ${BASE_URL}`);
  console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);

  testResults = [];

  await testAuth();
  await testStatistics();
  await testInventory();
  await testCustomer();
  await testOrder();
  await testRecognitionHistory();
  await testHealth();

  await cleanup();

  const summary = printSummary();

  return summary;
}

// 运行测试
runTests()
  .then((summary) => {
    console.log('\n========================================');
    process.exit(summary.failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('\n测试执行失败:', err);
    process.exit(1);
  });
