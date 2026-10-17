import { TestRunner } from "@/components/test/test-runner";
import { requireUser } from "@/lib/auth/session";
import { loadTestQuestions } from "@/lib/test/loader";

export default async function TestPage() {
  await requireUser();
  const questions = loadTestQuestions();

  return <TestRunner questions={questions} />;
}
