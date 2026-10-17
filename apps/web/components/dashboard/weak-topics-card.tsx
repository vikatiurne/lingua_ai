import { TriangleAlert } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function WeakTopicsCard({
  topics,
}: {
  topics: { topicName: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl font-semibold tracking-tight">
          Слабкі теми
        </CardTitle>
        <CardDescription>Теми, які варто повторити</CardDescription>
      </CardHeader>
      <CardContent>
        {topics.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Слабких тем не виявлено — чудова робота!
          </p>
        ) : (
          <ul className="space-y-2">
            {topics.map((topic) => (
              <li
                key={topic.topicName}
                className="flex items-center gap-2 text-sm"
              >
                <TriangleAlert className="h-4 w-4 shrink-0 text-primary" />
                <span>{topic.topicName}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
