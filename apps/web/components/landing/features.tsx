import { Target, Volume2, AlertCircle, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Target,
    title: "Персональний план",
    description: "AI аналізує твій рівень і будує план під тебе",
  },
  {
    icon: Volume2,
    title: "Переклад + озвучка",
    description: "Пиши від руки, слухай вимову, клікай на незнайомі слова",
  },
  {
    icon: AlertCircle,
    title: "Розбір помилок",
    description: "Дві оцінки: засвоєння теми + загальна граматика",
  },
  {
    icon: BookOpen,
    title: "Експорт у Quizlet",
    description: "Усі помилки — у флеш-картки однією кнопкою",
  },
];

export function Features() {
  return (
    <section>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">Як це працює</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="h-full bg-card/80 backdrop-blur">
              <CardHeader className="pb-2">
                <feature.icon className="h-6 w-6 text-primary" />
                <CardTitle className="mt-2 text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
