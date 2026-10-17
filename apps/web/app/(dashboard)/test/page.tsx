import { requireUser } from "@/lib/auth/session";
import { loadTestQuestions } from "@/lib/test/loader";
import { TestRunner } from "@/components/test/test-runner";

export default async function TestPage() {
  await requireUser();
  const questions = loadTestQuestions();

  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center px-4 py-10">
      <TestRunner questions={questions} />
    </main>
  );
}
