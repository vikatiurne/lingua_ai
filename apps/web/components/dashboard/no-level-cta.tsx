import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function NoLevelCTA() {
  return (
    <Card className="mx-auto max-w-xl text-center">
      <CardHeader className="space-y-2">
        <CardTitle className="font-display text-2xl font-semibold tracking-tight">
          Вітаємо!
        </CardTitle>
        <CardDescription className="text-base">
          Пройдіть тест рівня, щоб отримати персональний план
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="lg">
          <Link href="/test">Пройти тест</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
