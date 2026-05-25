const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db', { readonly: true });
const tables = ['Client','BudgetEntry','ActualWeekly','ActualNF','ForecastRevision','WeekComment','SyncJob','User'];
for (const t of tables) {
  try {
    const row = db.prepare(`SELECT COUNT(*) as n FROM "${t}"`).get();
    console.log(`${t}: ${row.n}`);
  } catch(e) {
    console.log(`${t}: ${e.message}`);
  }
}
db.close();
