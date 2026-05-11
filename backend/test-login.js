import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: 'test' } })
  if (existing) {
    const hash = await bcrypt.hash('123456', 10)
    await prisma.user.update({ where: { username: 'test' }, data: { password: hash } })
    console.log('密码已更新为 123456')
  } else {
    const hash = await bcrypt.hash('123456', 10)
    await prisma.user.create({ data: { username: 'test', password: hash, role: 'user' } })
    console.log('已创建 test / 123456')
  }
  
  // 验证登录
  const user = await prisma.user.findUnique({ where: { username: 'test' } })
  if (user) {
    const ok = await bcrypt.compare('123456', user.password)
    console.log('密码验证:', ok ? '成功' : '失败')
  }
  
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1); })
