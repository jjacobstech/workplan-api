// import bcrypt from "bcrypt";
// import { PrismaClient, Prisma } from "@/database/generated/prisma";

// export const seed = async () => {
//   const prisma = new PrismaClient();

//   try {
//     const rounds = 10;
//     const hashed_password = await bcrypt.hash("123456789", rounds);

//     const ministry_name = "ministry of finance";
//     const department_name = "transport";
//     const unit_name = "press";

//     const transaction = await prisma.$transaction(async (trx) => {
//       const ministry = await trx.ministry.upsert({
//         where: { name: ministry_name },
//         update: {},
//         create: { name: ministry_name },
//       });

//       const department = await trx.department.upsert({
//         where: {
//           name: department_name,
//           ministry_id: ministry.id,
//         },
//         update: {},
//         create: {
//           name: department_name,
//           ministry_id: ministry.id,
//         },
//       });

//       const unit = await trx.unit.upsert({
//         where: {
//           name: unit_name,
//           department_id: department.id,
//         },
//         update: {},
//         create: {
//           name: unit_name,
//           department_id: department.id,
//         },
//       });

//       return { ministry, department, unit };
//     });

//     const user: Prisma.UserCreateInput[] = [
//       {
//         employee_id: "GHUM/HST/AA/1134",
//         ministry_id: transaction.ministry.id,
//         department_id: transaction.department.id,
//         unit_id: transaction.unit.id,
//         role: "staff",
//         password: hashed_password,
//         staff: true,
//       },
//     ];

//     user.map(async (user) => {
//       await prisma.user.create({
//         data: user,
//       });
//     });
//   } catch (e) {
//     console.error(e);
//   } finally {
//     await prisma.$disconnect();
//   }
// };

// seed();
