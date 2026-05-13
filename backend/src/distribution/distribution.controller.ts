import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { DistributionService } from './distribution.service';
import { CreateInventoryDto, UpdateInventoryDto, BatchCreateInventoryDto } from './dto/inventory.dto';
import { CreateOrderDto, UpdateOrderDto, ShipOrderDto } from './dto/order.dto';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('配货模块')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('distribution')
export class DistributionController {
  constructor(private readonly service: DistributionService) {}

  // ==================== 统计 ====================

  @Get('statistics')
  @ApiOperation({ summary: '获取全局统计概览' })
  getStatistics() {
    return this.service.getStatistics();
  }

  // ==================== 库存管理 ====================

  @Get('inventory')
  @ApiOperation({ summary: '分页查询库存' })
  getInventoryList(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('keyword') keyword?: string,
    @Query('grade') grade?: string,
    @Query('status') status?: string,
    @Query('productType') productType?: string,
    @Query('specification') specification?: string,
    @Query('dateFrom') dateFrom?: string,
  ) {
    return this.service.getInventoryList({ page, limit, keyword, grade, status, productType, specification, dateFrom });
  }

  @Get('inventory/search')
  @ApiOperation({ summary: '库存远程搜索（用于下拉选择）' })
  searchInventory(@Query('keyword') keyword: string, @Query('limit') limit?: number) {
    return this.service.searchInventory(keyword || '', limit);
  }

  @Get('inventory/:id')
  @ApiOperation({ summary: '获取单条库存' })
  getInventoryById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getInventoryById(id);
  }

  @Post('inventory')
  @ApiOperation({ summary: '创建库存' })
  createInventory(@Body() dto: CreateInventoryDto) {
    return this.service.createInventory(dto);
  }

  @Post('inventory/batch')
  @ApiOperation({ summary: '批量创建库存' })
  batchCreateInventory(@Body() body: BatchCreateInventoryDto) {
    return this.service.batchCreateInventory(body.items, body.recognitionHistoryId);
  }

  @Patch('inventory/:id')
  @ApiOperation({ summary: '更新库存' })
  updateInventory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.service.updateInventory(id, dto);
  }

  @Delete('inventory/:id')
  @ApiOperation({ summary: '删除库存' })
  deleteInventory(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteInventory(id);
  }

  @Post('inventory/batch-delete')
  @ApiOperation({ summary: '批量删除库存' })
  batchDeleteInventory(@Body() body: { ids: number[] }) {
    return this.service.batchDeleteInventory(body.ids);
  }

  @Post('inventory/ai-recognize')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'AI 图像识别' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = join(process.cwd(), 'uploads/inventory');
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  aiRecognize(@UploadedFile() file: Express.Multer.File) {
    return this.service.aiRecognize(file);
  }

  // ==================== 客户管理 ====================

  @Get('customers')
  @ApiOperation({ summary: '获取所有客户' })
  getCustomers() {
    return this.service.getCustomers();
  }

  @Get('customers/:id')
  @ApiOperation({ summary: '获取单个客户' })
  getCustomerById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getCustomerById(id);
  }

  @Post('customers')
  @ApiOperation({ summary: '创建客户' })
  createCustomer(@Body() dto: CreateCustomerDto) {
    return this.service.createCustomer(dto);
  }

  @Put('customers/:id')
  @ApiOperation({ summary: '更新客户' })
  updateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.service.updateCustomer(id, dto);
  }

  @Delete('customers/:id')
  @ApiOperation({ summary: '删除客户（软删）' })
  deleteCustomer(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteCustomer(id);
  }

  // ==================== 配货单管理 ====================

  @Get('orders')
  @ApiOperation({ summary: '分页查询订单' })
  getOrderList(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('customerId') customerId?: number,
    @Query('keyword') keyword?: string,
    @Query('includeItems') includeItems?: string,
  ) {
    return this.service.getOrderList({
      page,
      limit,
      status,
      customerId,
      keyword,
      includeItems: includeItems === 'true',
    });
  }

  @Get('orders/:id')
  @ApiOperation({ summary: '获取订单详情（含明细+库存）' })
  getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOrderById(id);
  }

  @Post('orders')
  @ApiOperation({ summary: '创建订单' })
  createOrder(@Body() dto: CreateOrderDto) {
    return this.service.createOrder(dto);
  }

  @Put('orders/:id')
  @ApiOperation({ summary: '更新订单' })
  updateOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.service.updateOrder(id, dto);
  }

  @Delete('orders/:id')
  @ApiOperation({ summary: '删除订单（软删+释放库存）' })
  deleteOrder(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteOrder(id);
  }

  @Post('orders/batch-delete')
  @ApiOperation({ summary: '批量删除订单' })
  batchDeleteOrders(@Body() body: { ids: number[] }) {
    return this.service.batchDeleteOrders(body.ids);
  }

    // 移除 confirm 接口 - 创建后直接可发货

  @Post('orders/:id/ship')
  @ApiOperation({ summary: '发货' })
  shipOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ShipOrderDto,
  ) {
    return this.service.shipOrder(id, dto);
  }

  @Post('orders/:id/deliver')
  @ApiOperation({ summary: '完成发运' })
  deliverOrder(@Param('id', ParseIntPipe) id: number) {
    return this.service.deliverOrder(id);
  }

  @Post('orders/:id/cancel')
  @ApiOperation({ summary: '取消订单' })
  cancelOrder(@Param('id', ParseIntPipe) id: number) {
    return this.service.cancelOrder(id);
  }

  // ==================== AI 识别历史 ====================

  @Get('recognition-history')
  @ApiOperation({ summary: '分页查询识别历史' })
  getRecognitionHistory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('timeRange') timeRange?: string,
  ) {
    return this.service.getRecognitionHistory({ page, limit, status, timeRange });
  }

  @Delete('recognition-history/:id')
  @ApiOperation({ summary: '删除单条识别历史' })
  deleteRecognitionHistory(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteRecognitionHistory(id);
  }

  @Post('recognition-history/batch-delete')
  @ApiOperation({ summary: '批量删除识别历史' })
  batchDeleteRecognitionHistory(@Body() body: { ids: number[] }) {
    return this.service.batchDeleteRecognitionHistory(body.ids);
  }
}
