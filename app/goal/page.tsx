import { prisma } from "@/lib/prisma";
import BookshelfMeter from "@/components/BookshelfMeter";

const TARGET_READS = 5000;

export default async function GoalPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Replace "readEvent" with your actual read tracking table
  const monthlyReads = await prisma.readEvent.count({
    where: {
      createdAt: { gte: startOfMonth }
    }
  });

  // Days left in the current month
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = endOfMonth.getDate() - now.getDate();

  const progress = Math.min(monthlyReads / TARGET_READS, 1);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center p-8 gap-10">

      {/* ⭐ You will edit this text later in CEO Studio */}
      <section className="max-w-3xl text-center space-y-4">
        <h1 className="text-4xl font-bold">LLC Finish Line</h1>
        <p className="text-slate-300">
          This dark oak shelf fills with animated liquid as readers consume stories.
          When it reaches the top, we hit the milestone needed to form the LLC.
        </p>

        <p className="text-slate-400 text-sm">
          Current month reads:{" "}
          <span className="font-semibold">{monthlyReads}</span> / {TARGET_READS}
        </p>

        <p className="text-slate-400 text-sm">
          Days left in this month:{" "}
          <span className="font-semibold">{daysLeft}</span>
        </p>
      </section>

      <BookshelfMeter progress={progress} />

      {/* ⭐ You will edit this text later in CEO Studio */}
      <section className="max-w-3xl space-y-4 text-slate-300">
        <h2 className="text-2xl font-bold">The Goal</h2>
        <p>
          Once the shelf fills, Dramatized Fiction becomes an official company with
          full author payouts, contracts, and long‑term infrastructure.
        </p>
        <p>
          This milestone represents stability, momentum, and the confidence to scale
          the platform into a real business.
        </p>
      </section>

    </main>
  );
}
