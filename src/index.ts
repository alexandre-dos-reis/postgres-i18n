import { Elysia } from "elysia";
import { PrismaClient, LangCode } from "@prisma/client";

const prisma = new PrismaClient();

const db = prisma.$extends({
  model: {
    product: {
      async findManyI18n(
        i18n?: {
          lang: LangCode;
          noFallback?: boolean;
        },
        args?: Parameters<typeof prisma.product.findMany>[0],
      ) {
        const products = await prisma.product.findMany({
          ...args,
          include: {
            ...args?.include,
            translations: {
              where: {
                languageId: i18n?.lang || LangCode.FR,
              },
              select: {
                name: true,
                description: true,
                languageId: true,
              },
            },
          },
        });

        return Promise.all(
          products.map(async (p) => {
            const { translations, ...e } = { ...p, ...p.translations[0] };

            if (!i18n?.noFallback && p.translations.length === 0) {
              const fallback = await prisma.productTranslation.findFirst({
                where: {
                  languageId: LangCode.FR,
                },
                select: {
                  description: true,
                  name: true,
                  languageId: true,
                },
              });
              return { ...e, ...fallback };
            }
            return e;
          }),
        );
      },
    },
  },
});

async function main() {
  const fr = await db.product.findManyI18n();

  const en = await db.product.findManyI18n({
    lang: "EN",
  });

  console.log({ fr, en });
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });

// const app = new Elysia().get("/", () => "Hello Elysia").listen(3000);
//
// console.log(
//   `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
// );
