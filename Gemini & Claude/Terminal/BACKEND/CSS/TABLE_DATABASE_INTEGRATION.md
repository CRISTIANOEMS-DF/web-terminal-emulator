# ConsoleTable v4.0.0 — Database Integration & Scraping Guide

## 📋 Overview

ConsoleTable v4.0.0 é um renderizador avançado de tabelas com suporte completo para:

- ✅ **Database Integration**: Linkado com `console.database.js`
- ✅ **Table Scraping**: Extrai tabelas de websites externos
- ✅ **Table Overwrite**: Sobrescreve tabelas no database
- ✅ **Advanced Operations**: Sort, filter, search, pagination
- ✅ **Export**: CSV, JSON, HTML download
- ✅ **Module Detection**: Detecta 9 módulos integrados

## 🔗 Integração com ConsoleDatabase

### Conexão da Database

```javascript
// database.js expõe ConsoleDatabase
const database = window.ConsoleDatabase;

// table.js conecta ao database
const table = window.ConsoleTable;
table.connectDatabase(database);
table.connectRenderer(window.ConsoleRenderer);
```

### Fluxo de Dados

```
[User Command]
    ↓
[ConsoleCommand → "SELECT FROM users"]
    ↓
[ConsoleDatabase.query("SELECT FROM users")]
    ↓
[Returns: Array of objects]
    ↓
[ConsoleTable.render(data)]
    ↓
[HTML table markup]
    ↓
[ConsoleRenderer.renderTable(html)]
    ↓
[Terminal Display]
```

## 📊 API Completa

### Render Methods

```javascript
// Renderizar dados simples
const html = ConsoleTable.render([
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
]);

// Com colunas específicas
const html = ConsoleTable.render(data, ["id", "name"]);

// Com options (filtros, caption, etc)
const html = ConsoleTable.render(data, null, {
  caption: "Users Table",
  filters: { status: "active" },
  tableId: "users-table",
});
```

### Database Integration

```javascript
// Conectar database
ConsoleTable.connectDatabase(ConsoleDatabase);

// Obter tabela do database
const data = ConsoleTable.getTableFromDatabase("users");

// Renderizar tabela do database
const html = ConsoleTable.renderFromDatabase("users");

// Sobrescrever tabela no database
const success = ConsoleTable.overwriteTable("users", newUserData);
```

### Scraping de Websites

```javascript
// Scraping simples
const result = await ConsoleTable.scrapeAndOverwrite(
  "https://example.com/products",
  "table.products",
  "products_table",
);
//  {
//    success: true,
//    tableName: "products_table",
//    rowsScraped: 50,
//    data: [...]
//  }

// Scraping múltiplas tabelas
const results = await ConsoleTable.scrapeMultipleTables(
  "https://example.com",
  "table", // selector para todas as tabelas
);
// {
//   success: true,
//   count: 3,
//   tables: [
//     { tableName: "scraped_..._0", rows: 10, data: ... },
//     { tableName: "scraped_..._1", rows: 25, data: ... },
//     { tableName: "scraped_..._2", rows: 15, data: ... }
//   ]
// }
```

### Table Operations

```javascript
// Sorting
const sorted = ConsoleTable.sortByColumn(data, "name", "asc");

// Filtering
const filtered = ConsoleTable.filterByColumns(data, {
  status: "active",
  role: "admin",
});

// Search
const results = ConsoleTable.search(data, "john");

// Pagination
const page = ConsoleTable.paginate(data, 10, 1);
// { data: [...], page: 1, pageSize: 10, total: 100, pages: 10, ... }
```

### Exports

```javascript
// CSV Export
const csv = ConsoleTable.exportCSV(data, ["id", "name", "email"]);

// JSON Export
const json = ConsoleTable.exportJSON(data);

// Download
ConsoleTable.downloadTable(data, ["id", "name"], "csv", "users");
```

## 🗄️ Module Dependencies

### Required for Full Functionality

```javascript
// BACKEND/CSS/console.renderer.js (v3.0.0)
ConsoleTable.connectRenderer(ConsoleRenderer);

// BACKEND/COMMANDS/console.database.js (v1.0.0 - assumed)
ConsoleTable.connectDatabase(ConsoleDatabase);
```

### Optional Enhancements

```javascript
// BACKEND/API/console.bridge.js - para scraping HTTP
// Detectado automaticamente via global.ConsoleBridge

// BACKEND/CSS/console.theme.js - temas customizados
// Será aplicado automaticamente via CSS classes

// BACKEND/COMMANDS/console.commands.js - CLI integration
// Detecta comandos como: "table list", "table describe users"
```

## 🎨 CSS Classes & Styling

### Table Structure

```html
<table class="wc-table wc-data-table" id="table-123">
  <caption class="wc-table-caption">
    Table Title
  </caption>

  <thead class="wc-table-head">
    <tr class="wc-header-row">
      <th class="wc-table-header-cell" data-col-index="0" data-sortable="true">
        <span class="wc-header-text">ID</span>
        <span class="wc-sort-icon">⇅</span>
      </th>
      <th class="wc-table-header-cell" data-col-index="1">NAME</th>
    </tr>
  </thead>

  <tbody class="wc-table-body">
    <tr class="wc-table-row wc-row-0" data-row-index="0">
      <td class="wc-table-cell" data-col-index="0">1</td>
      <td class="wc-table-cell" data-col-index="1">Alice</td>
    </tr>
    <tr class="wc-table-row wc-row-1" data-row-index="1">
      <td class="wc-table-cell" data-col-index="0">2</td>
      <td class="wc-table-cell" data-col-index="1">Bob</td>
    </tr>
  </tbody>
</table>
```

### CSS Classes for Styling

```css
/* Main table */
.wc-table {
  /* core styles */
}
.wc-data-table {
  /* regular table */
}
.wc-db-table {
  /* database table */
}
.wc-db-users {
  /* specific database table */
}

/* Header */
.wc-table-head {
  /* header styling */
}
.wc-header-row {
  /* header row */
}
.wc-table-header-cell {
  /* header cell */
}
.wc-header-text {
  /* header text */
}
.wc-sort-icon {
  /* sort icon */
}

/* Body */
.wc-table-body {
  /* body styling */
}
.wc-table-row {
  /* regular row */
}
.wc-row-0 {
  /* even rows */
}
.wc-row-1 {
  /* odd rows */
}
.wc-table-cell {
  /* cell styling */
}

/* Special states */
.wc-table-empty {
  /* empty table */
}
.wc-table-error {
  /* error table */
}
```

## 🔄 Example Integration Scenario

### Scenario: Load Products from Database, Filter, Render

```javascript
// 1. Setup connections
ConsoleTable.connectDatabase(ConsoleDatabase);
ConsoleTable.connectRenderer(ConsoleRenderer);

// 2. Load from database
const products = ConsoleTable.getTableFromDatabase("products");

// 3. Filter and sort
const filtered = ConsoleTable.filterByColumns(products, {
  category: "electronics",
});
const sorted = ConsoleTable.sortByColumn(filtered, "price", "asc");

// 4. Paginate
const page1 = ConsoleTable.paginate(sorted, 20, 1);

// 5. Render
const html = ConsoleTable.render(page1.data, null, {
  caption: "Electronics Products - Page 1",
  className: "wc-products-table",
});

// 6. Display in terminal
ConsoleRenderer.renderTable(page1.data, ["id", "name", "price"]);
```

### Scenario: Scrape and Overwrite

```javascript
// Scrape products from external site
const result = await ConsoleTable.scrapeAndOverwrite(
  "https://competitor.com/products",
  "table.product-list",
  "competitor_products",
);

if (result.success) {
  console.log(`Scraped ${result.rowsScraped} products`);

  // Render the scraped data
  const html = ConsoleTable.render(result.data);
  ConsoleRenderer.renderTable(result.data);

  // Database now has the data in "competitor_products" table
  const stored = ConsoleTable.getTableFromDatabase("competitor_products");
}
```

### Scenario: Export and Download

```javascript
// Get data
const userData = ConsoleTable.getTableFromDatabase("users");

// Download as CSV
ConsoleTable.downloadTable(
  userData,
  ["id", "name", "email", "role"],
  "csv",
  "users_export",
);

// Or export as JSON for use in other apps
const json = ConsoleTable.exportJSON(userData);
console.log(json);
```

## 📋 Module Detection

```javascript
// Check what modules are linked
const info = ConsoleTable.getInfo();
console.log(info.hasSupportedModules);

// Output:
// {
//   consoleRenderer: true,
//   consoleDatabase: true,
//   consoleCommands: true,
//   consoleTheme: true,
//   consoleSettings: true,
//   consoleBridge: true,
//   consoleEngine: false,
//   consoleKeyboard: true,
//   webConsole: true
// }
```

## 🛠️ ConsoleDatabase Integration Protocol

### Expected ConsoleDatabase Methods

```javascript
// ConsoleDatabase should provide:

// Get a table
database.getTable(tableName) → Array

// Update/overwrite a table
database.updateTable(tableName, data) → boolean

// List all tables
database.listTables() → Array<string>

// Delete a table
database.deleteTable(tableName) → boolean

// Query a table
database.query(sql) → Array
```

### Example Database Implementation

```javascript
class ConsoleDatabase {
  constructor() {
    this._tables = new Map();
  }

  getTable(name) {
    return this._tables.get(name) || null;
  }

  updateTable(name, data) {
    this._tables.set(name, data);
    return true;
  }

  listTables() {
    return Array.from(this._tables.keys());
  }

  deleteTable(name) {
    return this._tables.delete(name);
  }

  query(sql) {
    // Parse and execute SQL
    // Return results
  }
}

window.ConsoleDatabase = new ConsoleDatabase();
```

## 📊 Console Output

```
[ConsoleTable] ℹ v4.0.0 instantiated
[ConsoleTable] ℹ Connected to ConsoleDatabase
[ConsoleTable] ℹ Connected to ConsoleRenderer
[ConsoleTable] ℹ Table rendered: table-1711324800000
              (50/50 rows × 5 cols)
[ConsoleTable] ✓ Table overwritten: products (120 rows)
[ConsoleTable] ℹ Scraped: 45 rows from https://example.com
              → scraped_1711324800000
[ConsoleTable] ✓ Downloaded: users_export.csv
[ConsoleTable] Module links: ConsoleRenderer, ConsoleDatabase,
              ConsoleCommands, ConsoleTheme, ConsoleSettings,
              ConsoleBridge, ConsoleEngine, ConsoleKeyboard, WebConsole
```

## 🚀 Performance Tips

1. **Pagination**: Use `paginate()` for large datasets (>1000 rows)
2. **Caching**: Tables são cacheadas automaticamente via ID
3. **Filtering**: Aplique filtros antes de render para melhor performance
4. **Scraping**: Cache de scraping results no database para reuso

## 🔮 Future Enhancements

- [ ] Live table updates via WebSocket
- [ ] Advanced SQL queries
- [ ] Table joins between databases
- [ ] Aggregate functions (SUM, AVG, COUNT)
- [ ] Pivoting e reshaping
- [ ] Real-time sync with remote databases

---

**Integração completa com**: ConsoleRenderer, ConsoleDatabase, ConsoleCommands, ConsoleTheme, ConsoleSettings, ConsoleBridge, ConsoleEngine, ConsoleKeyboard, WebConsole

**Versão**: 4.0.0  
**License**: MIT
