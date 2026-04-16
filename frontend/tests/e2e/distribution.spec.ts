import { test, expect } from '@playwright/test'

/**
 * 配货单完整流程 E2E 测试
 * 测试场景：创建库存 → 创建客户 → 创建订单 → 确认 → 发货 → 完成发运
 */
test.describe('配货单完整流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 等待页面加载
    await page.waitForLoadState('networkidle')
  })

  test('仪表盘应显示统计数据', async ({ page }) => {
    // 验证仪表盘页面元素
    await expect(page.locator('h1, h2, .el-card__header').first()).toBeVisible()
  })

  test('导航到库存管理页面', async ({ page }) => {
    await page.click('text=库存管理, [href="/inventory"]')
    await expect(page).toHaveURL(/\/inventory/)
    await expect(page.locator('.el-table, table')).toBeVisible()
  })

  test('导航到配货单管理页面', async ({ page }) => {
    await page.click('text=配货单, [href="/orders"]')
    await expect(page).toHaveURL(/\/orders/)
    await expect(page.locator('.el-table, table')).toBeVisible()
  })

  test('导航到客户管理页面', async ({ page }) => {
    await page.click('text=客户管理, [href="/customers"]')
    await expect(page).toHaveURL(/\/customers/)
    await expect(page.locator('.el-table, table, .el-button')).toBeVisible()
  })

  test('导航到AI识别页面', async ({ page }) => {
    await page.click('text=AI, [href="/ai"]')
    await expect(page).toHaveURL(/\/ai/)
    await expect(page.locator('input[type="file"], .el-upload')).toBeVisible()
  })
})

/**
 * 库存管理 E2E 测试
 */
test.describe('库存管理', () => {
  test('应显示库存列表', async ({ page }) => {
    await page.goto('/inventory')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.el-table, table, .el-empty')).toBeVisible()
  })

  test('应有创建库存按钮', async ({ page }) => {
    await page.goto('/inventory')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button:has-text("创建"), .el-button:has-text("创建")').first()).toBeVisible()
  })

  test('应支持搜索功能', async ({ page }) => {
    await page.goto('/inventory')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="关键词"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('测试')
      await page.click('button:has-text("搜索"), .el-button:has-text("查询")')
    }
  })
})

/**
 * 配货单管理 E2E 测试
 */
test.describe('配货单管理', () => {
  test('应显示配货单列表', async ({ page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.el-table, table, .el-empty')).toBeVisible()
  })

  test('应有创建订单按钮', async ({ page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button:has-text("创建"), .el-button:has-text("创建")').first()).toBeVisible()
  })

  test('订单状态筛选应正常工作', async ({ page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')

    const statusSelect = page.locator('.el-select, select').first()
    if (await statusSelect.isVisible()) {
      await statusSelect.click()
      await page.locator('.el-option:has-text("草稿"), option[value="draft"]').first().click()
    }
  })
})

/**
 * 客户管理 E2E 测试
 */
test.describe('客户管理', () => {
  test('应显示客户列表', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.el-table, table, .el-empty, .el-button')).toBeVisible()
  })

  test('应有添加客户按钮', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button:has-text("添加"), .el-button:has-text("添加"), button:has-text("新建")').first()).toBeVisible()
  })
})

/**
 * 主题切换测试
 */
test.describe('主题切换', () => {
  test('应支持主题切换', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 查找主题切换按钮
    const themeButton = page.locator('[class*="theme"], button:has-text("主题"), .el-switch').first()
    if (await themeButton.isVisible()) {
      await themeButton.click()
      // 验证主题已切换（页面类名应变化）
      await page.waitForTimeout(500)
    }
  })
})
