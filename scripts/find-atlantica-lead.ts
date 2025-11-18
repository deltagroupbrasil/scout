import { prisma } from '../lib/prisma'

async function find() {
  const lead = await prisma.lead.findFirst({
    where: { company: { name: { contains: 'Atlantica' } } },
    select: { id: true, company: { select: { name: true } } }
  })

  if (lead) {
    console.log(`Lead ID: ${lead.id}`)
    console.log(`Empresa: ${lead.company.name}`)
    console.log(`URL: http://localhost:3000/dashboard/leads/${lead.id}`)
  } else {
    console.log('Nenhum lead encontrado')
  }

  await prisma.$disconnect()
}

find()
