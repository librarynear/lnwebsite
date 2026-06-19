import { getSession } from "@/app/actions/auth-actions";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import FinancialCharts from "./FinancialCharts";
import { ExpenseForm, DeleteExpenseButton } from "./ExpenseForm";
import DateRangeFilter from "@/components/DateRangeFilter";

export default async function FinancialsPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string, to?: string, page?: string }>
}) {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) {
    redirect("/dashboard");
  }

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : { librarianId: session.userId }, });
  if (!library) redirect("/onboarding");

  // Await searchParams properly in Next.js 15
  const sp = await searchParams;
  const fromDate = sp?.from ? new Date(sp.from) : undefined;
  const toDate = sp?.to ? new Date(sp.to) : undefined;
  
  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  const dateFilter = fromDate || toDate ? {
    gte: fromDate,
    lte: toDate
  } : undefined;

  const bookings = await prisma.booking.findMany({
    where: { 
      libraryId: library.id,
      status: { in: ['CONFIRMED', 'COMPLETED'] },
      ...(dateFilter ? { createdAt: dateFilter } : {})
    },
    include: {
      plan: true,
      standaloneLocker: true,
      student: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch expenses
  const expensesList = await prisma.expense.findMany({
    where: { 
      libraryId: library.id,
      ...(dateFilter ? { date: dateFilter } : {})
    },
    orderBy: { createdAt: 'desc' }
  });

  const currentPage = parseInt(sp?.page || '1', 10);
  const perPage = 15;
  const totalPages = Math.ceil(bookings.length / perPage);
  const paginatedBookings = bookings.slice((currentPage - 1) * perPage, currentPage * perPage);

  let totalGrossRevenue = 0;
  bookings.forEach(b => {
    let price = b.plan.price;
    if (b.plan.discount) {
      price = price - (price * b.plan.discount / 100);
    }
    totalGrossRevenue += price;
    if (b.standaloneLocker) {
      totalGrossRevenue += b.standaloneLocker.price;
    }
  });

  const totalExpenses = expensesList.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalGrossRevenue - totalExpenses;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">Financial Overview</h1>
        <p className="text-muted-foreground mt-1">Track your revenue, expenses, and net profit.</p>
      </div>

      <DateRangeFilter />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Gross Revenue</p>
              <h3 className="text-2xl font-bold text-foreground">₹{totalGrossRevenue.toLocaleString()}</h3>
            </div>
          </div>
          <div className="text-xs font-medium text-muted-foreground">From all confirmed bookings</div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-destructive/10 rounded-xl text-destructive">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
              <h3 className="text-2xl font-bold text-foreground">₹{totalExpenses.toLocaleString()}</h3>
            </div>
          </div>
          <div className="text-xs font-medium text-muted-foreground">Bills, rent, salaries, etc.</div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-success/10 rounded-xl text-success">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
              <h3 className="text-3xl font-bold text-foreground">₹{netProfit.toLocaleString()}</h3>
            </div>
          </div>
          <div className="text-xs font-medium text-success flex items-center gap-1">
            {netProfit >= 0 ? "Profitable" : "Operating at a loss"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Expenses Manager */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col">
          <h2 className="text-xl font-bold font-heading mb-2">Manage Expenses</h2>
          <p className="text-sm text-muted-foreground mb-6">Add monthly bills or one-time expenses here.</p>
          
          <ExpenseForm libraryId={library.id} />

          <div className="mt-8 flex-1">
            <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Recent Expenses</h3>
            {expensesList.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
                No expenses recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {expensesList.map(exp => (
                  <div key={exp.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div>
                      <p className="font-semibold text-sm">{exp.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(exp.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-destructive">₹{exp.amount.toLocaleString()}</span>
                      <DeleteExpenseButton expenseId={exp.id} libraryId={library.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col">
          <h2 className="text-xl font-bold font-heading mb-2">Profit vs Expenses</h2>
          <p className="text-sm text-muted-foreground mb-6">Visual breakdown of your financial health.</p>
          
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <FinancialCharts revenue={totalGrossRevenue} expenses={totalExpenses} netProfit={netProfit} />
          </div>
        </div>
      </div>

      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col">
        <h2 className="text-xl font-bold font-heading mb-6">Transaction History</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Date & Time</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Student & Plan</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground">Payment Ref</th>
                <th className="p-4 text-xs uppercase tracking-wider font-bold text-muted-foreground text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedBookings.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">No transactions found for this period.</td></tr>
              ) : (
                paginatedBookings.map((b) => {
                  let price = b.plan?.price || 0;
                  if (b.plan?.discount) price -= (price * b.plan.discount / 100);
                  if (b.standaloneLocker) price += b.standaloneLocker.price;
                  
                  const isRazorpay = b.paymentRef?.startsWith('pay_');
                  const isManual = b.paymentRef?.startsWith('MANUAL_');
                  const isRenewal = b.paymentRef?.startsWith('RENEWAL_');
                  const isReception = b.paymentRef?.startsWith('RECEPTION_');
                  
                  let payMethod = "Cash/Manual";
                  if (isRazorpay) payMethod = "Razorpay";
                  else if (isRenewal) payMethod = b.paymentRef?.includes('ONLINE') ? "Renewal (Online)" : "Renewal (Cash)";
                  else if (isReception) payMethod = b.paymentRef?.includes('ONLINE') ? "Reception (Online)" : "Reception (Cash)";
                  else if (isManual && b.paymentRef?.includes('ONLINE')) payMethod = "Manual (Online)";

                  return (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 whitespace-nowrap">
                        <div className="text-sm font-bold">{b.createdAt.toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">{b.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold text-foreground">{b.student?.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{b.plan?.name || 'Custom Plan'}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-xs text-primary/80">{b.paymentRef || 'No Ref'}</div>
                        <div className="bg-muted px-2 py-0.5 rounded w-max mt-1 text-[10px] uppercase font-bold text-muted-foreground">{payMethod}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-sm font-bold text-success">+₹{price.toFixed(0)}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, bookings.length)} of {bookings.length} transactions
            </p>
            <div className="flex gap-2">
              <a 
                href={`?from=${sp?.from || ''}&to=${sp?.to || ''}&page=${Math.max(1, currentPage - 1)}`}
                className={`px-3 py-1.5 rounded border text-sm font-medium ${currentPage === 1 ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:bg-muted'}`}
              >
                Previous
              </a>
              <a 
                href={`?from=${sp?.from || ''}&to=${sp?.to || ''}&page=${Math.min(totalPages, currentPage + 1)}`}
                className={`px-3 py-1.5 rounded border text-sm font-medium ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:bg-muted'}`}
              >
                Next
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
