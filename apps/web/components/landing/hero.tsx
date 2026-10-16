import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl">
            Вивчай англійську з AI-наставником
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Персональний план, щоденні вправи, розбір помилок. Від A1 до C2.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg">
              <Link href="/register">Почати безкоштовно</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
