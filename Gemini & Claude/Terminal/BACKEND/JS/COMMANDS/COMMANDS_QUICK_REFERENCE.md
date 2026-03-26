# 🎯 Console Commands — Quick Reference Card

## 📋 System Commands

```bash
help                    # Show all available commands
help select            # Show help for specific command
help --all            # Show categories and commands

clear                  # Clear terminal screen
cls                    # Alias for clear

echo "text"           # Print text to terminal
print "text"          # Alias for echo

version               # Show module versions
ver                   # Alias for version

info                  # Show system information
info registry         # Registry information
sysinfo              # Alias for info

time                 # Show current date/time
meminfo              # Show memory usage
```

## 💾 Database Commands

### Select/Query

```bash
select users                              # Get all rows
select users --limit 10                   # Limit results
select users --where status=active        # With condition
select users --cols id,name              # Specific columns

query users                               # Alias for select
select users --limit 5 --where type=admin  # Combined options
```

### Insert

```bash
insert users --name=Alice --email=alice@test.com
insert products --id=5 --name="Laptop" --price=1000
insert table --col1=val1 --col2=val2
```

### Describe

```bash
describe users                # Show table schema
describe products             # Table information
desc orders                   # Alias for describe
schema payments              # Alias for describe
```

### List

```bash
list                         # List all tables
list --detailed              # With statistics
tables                       # Alias for list
ls                          # Alias for list
```

## 📊 Table Commands

### Render

```bash
render users                              # Display table
show users                               # Alias for render
display users                            # Alias for render
render users --cols id,name,email       # Specific columns
render users --cols id,name             # Multiple columns
```

### Export

```bash
export users --format csv --file myusers
export users --format json
export products --format csv --file products_list
download users --format csv

# Formats: csv, json, html
# File: destination filename (without extension)
```

## 🔍 Query Examples

### Filtering

```bash
select users --where status=active
select users --where active=1
select products --where price>100
```

### Pagination

```bash
select users --limit 10      # First 10 rows
select users --limit 20      # First 20 rows
```

### Combined

```bash
select orders --where status=pending --limit 5
select users --where role=admin --limit 10
```

## 📜 History & Undo

```bash
history                 # Show last commands
history --limit 20      # Show last 20 commands
hist                    # Alias for history

undo                    # Undo last reversible action
u                       # Alias for undo

redo                    # Redo last undone action
r                       # Alias for redo
```

## 🛠️ Quick Tips

### Common Patterns

```bash
# View and export
select users | export users --format csv

# Filter and render
select users --where status=active
render products --cols id,name,price

# Query and limit
select customers --limit 5
select orders --limit 10 --where status=shipped
```

### Command Options

```bash
# Long form
--format csv              # Named option with value
--limit 10               # Named option with value
--where conditions       # Named option with value

# Short form
-f csv                   # Single letter shortcut
-l 10                    # Single letter shortcut
```

### Column Selection

```bash
render users --cols id,name,email
export users --cols id,name,email

# Available columns depend on table contents
# Use "describe" command to see available columns
```

## 🚀 Workflow Examples

### Complete Data Management

```bash
# 1. Create/view table
show users

# 2. Add record
insert users --name=Bob --email=bob@test.com

# 3. View updated
select users

# 4. Filter
select users --where status=active

# 5. Export
export users --format csv --file final_users

# 6. Check history
history
```

### Table Export

```bash
# View what you have
render products

# Export as CSV
export products --format csv --file products_backup

# Export as JSON
export products --format json --file products_data

# Specific columns
render products --cols id,name,price
```

### Data Exploration

```bash
# List available tables
list

# Detailed info
list --detailed

# Check table structure
describe users
describe orders

# View sample data
select users --limit 5

# Export for analysis
export users --format json
```

## 📚 Aliases Quick Reference

| Command  | Aliases       |
| -------- | ------------- |
| help     | h, ?          |
| clear    | cls           |
| echo     | print         |
| version  | ver           |
| info     | sysinfo       |
| select   | query, sel    |
| describe | desc, schema  |
| list     | tables, ls    |
| render   | show, display |
| export   | download      |
| history  | hist          |
| undo     | u             |
| redo     | r             |

## ⚡ Keyboard Shortcuts

### Navigation

- **↑** - Previous command
- **↓** - Next command
- **Home** - Start of line
- **End** - End of line

### Editing

- **Ctrl+A** / **Cmd+A** - Select all
- **Ctrl+C** / **Cmd+C** - Copy
- **Ctrl+V** / **Cmd+V** - Paste
- **Backspace** - Delete character
- **Ctrl+U** / **Cmd+U** - Clear line

### Unix-like

- **Ctrl+E** - End of line
- **Ctrl+L** - Clear screen
- **Ctrl+K** - Delete to end

## 🎨 Output Types

### Info Output

```bash
help                # Light blue background
version             # Info style
info                # System info style
```

### Success Output

```bash
echo "Success!"     # Green checkmark
export done         # Success message
```

### Warning Output

```bash
clear               # Yellow warning
history limit       # Warning style
```

### Error Output

```bash
select nonexist      # Red error
invalid command      # Error message
```

## 📊 Output Formatting

### Tables

- Headers with column names
- Data rows with alternating colors
- Cell borders and padding
- Responsive to terminal width

### CSV Export

```csv
id,name,email
1,Alice,alice@test.com
2,Bob,bob@test.com
```

### JSON Export

```json
[
  { "id": 1, "name": "Alice", "email": "alice@test.com" },
  { "id": 2, "name": "Bob", "email": "bob@test.com" }
]
```

## 🔧 Advanced Usage

### Custom Column Order

```bash
render users --cols email,name,id   # Custom order
```

### Multiple Filters

```bash
# Select and export
select users --limit 10 | export users

# Render with selection
render products --cols id,name,price
```

### Large Datasets

```bash
select products --limit 100          # First batch
select products --where category=electronics --limit 50

# For 1000+ rows, always use limit
```

## 🐛 Troubleshooting

### Command Not Found

```bash
help              # See available commands
list              # Check what tables exist
```

### Invalid Table

```bash
list              # List all available tables
describe TABLE    # Check table exists first
```

### Empty Results

```bash
select TABLE              # Check data exists
select TABLE --limit 1    # Try smaller result
describe TABLE            # Check table structure
```

### Export Failed

```bash
# Try different format
export TABLE --format json

# Try simpler columns
render TABLE --cols id,name

# Check database module
info
```

## 💡 Pro Tips

1. **Always validate**: Use `describe` before querying
2. **Limit results**: Use `--limit` for large datasets
3. **Use aliases**: `sel`, `desc`, `show` are faster to type
4. **Check history**: Use `history` to repeat commands
5. **Backup data**: `export` before major changes
6. **Monitor system**: Use `meminfo` for memory usage

## 📱 GUI Shortcuts (if available)

| Shortcut | Action       |
| -------- | ------------ |
| Ctrl+/   | Toggle help  |
| Ctrl+L   | Clear screen |
| Ctrl+H   | History      |
| Ctrl+E   | Export       |
| Ctrl+Z   | Undo         |
| Ctrl+Y   | Redo         |

## 🎯 Common Tasks

### View All Data

```bash
select TABLENAME
```

### Export All

```bash
export TABLENAME --format csv --file backup
```

### Add Record

```bash
insert TABLENAME --field1=value1 --field2=value2
```

### Filter View

```bash
select TABLENAME --where field=value
```

### Limited Results

```bash
select TABLENAME --limit 10
```

### Check Info

```bash
describe TABLENAME
list --detailed
info
```

---

**Print this card for quick reference!**

**Version**: 1.0.0  
**Last Updated**: 2026-03-25  
**License**: MIT
