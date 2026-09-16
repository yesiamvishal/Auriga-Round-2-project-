# Reasoning

## 1. Problem understanding

The organiser is not only trying to answer whether a target amount was collected. They also need to know whether each person has contributed their fair share and how to settle the difference without manually comparing messages and bank transfers.

The product therefore answers four practical questions:

1. What is the target, and how much has been collected?
2. What is the equal share for each participant?
3. Who still owes money and who has paid extra?
4. What is the shortest understandable list of payments to finish the pool?

The added import requirement introduces a fifth question: can the app safely turn an untidy historical contribution list into trustworthy totals and explain what it changed?

## 2. Scope and technology choice

The solution uses only HTML, CSS, and JavaScript. This keeps it small enough to build quickly and makes deployment possible on GitHub Pages or any static host. There is no backend, account system, build step, or third-party dependency.

The trade-off is that data is stored only in the current browser using `localStorage`. That is appropriate for a lightweight organiser tool, but it does not provide multi-device collaboration or a shared source of truth for a whole team.

## 3. Core data model

The application stores one pool object:

```text
pool.name       - the name of the shared expense
pool.target     - the amount the group is trying to collect
pool.people     - an array of participants
```

Each participant has:

```text
id              - a browser-local identifier
name            - the display name
paid            - the participant's total contribution
```

The import feature produces the same `people` structure as manual entry. This is important because imported data then uses the existing summary, balance, and settlement code instead of creating a separate calculation path.

## 4. Equal shares and balances

The first version deliberately assumes equal shares:

```text
equal share = target amount / number of people
balance = amount paid - equal share
```

A negative balance means the participant still owes money. A positive balance means they paid extra and should receive money back. A balance close to zero is displayed as `all even` to avoid distracting users with tiny floating-point differences.

The dashboard renders the collected amount, remaining amount, equal share, progress percentage, paid count, and overall status. All of these values are recalculated from the current state whenever an input changes.

## 5. Settlement plan

The settlement calculation creates two lists:

- Debtors: people whose balance is below zero.
- Creditors: people whose balance is above zero.

Both lists are sorted by the size of the outstanding balance. The largest remaining debtor is matched with the largest remaining creditor. The transfer amount is the smaller of the two balances. Once one balance reaches zero, the next person is matched.

This greedy approach is easy to explain and produces a compact plan for the equal-share use case. It supports partial payments, extra payments, people who paid nothing, and collections that have already exceeded the target.

## 6. Messy contribution import

The import panel accepts a local CSV or pasted text. It supports comma-separated, tab-separated, and semicolon-separated rows. The expected logical columns are `name` and `amount`; a header row is optional.

### Amount cleaning

The parser removes common currency symbols, comma separators, and spaces before validating the value. Examples such as `₹1,500`, `1 800`, `900.00`, and `0` become numeric amounts. Empty, non-numeric, and negative amounts are rejected rather than silently converted.

### Name cleaning and merging

Names are trimmed, repeated spaces are collapsed, and comparison is case-insensitive. The app also uses a small edit-distance check for simple spelling variations. For example, `Aarav` and `aarav` resolve to the same participant. The first accepted spelling is kept as the display name, and later rows add to that person's total.

### Duplicate handling

An exact duplicate is identified using the normalized name and amount together. A repeated identical row is removed from the totals and counted in the report. This prevents accidental duplicate history from inflating the pool while still making the decision visible to the organiser.

### Rejection report

Every rejected row keeps its source line number and a reason, such as `missing person name` or `invalid amount`. The report also shows valid rows, resulting people, duplicates removed, merged rows, and cleaned total. This makes the import auditable instead of silently changing financial data.

Import parses the complete input before replacing the current people list. If there are invalid rows, valid rows can still be imported, but the organiser can see exactly what was rejected and correct it later.

## 7. User experience choices

- **Load example** makes the original farewell-gift scenario immediately testable.
- **Reset** provides a clear way to start over.
- Summary cards answer the most common questions without requiring calculation.
- The People section shows the source contribution and resulting balance together.
- The Settlement plan uses direct payer-to-recipient cards rather than exposing internal algorithm details.
- The import report is placed before the people list so cleaning happens before the organiser trusts the resulting balances.
- Responsive CSS keeps the workflow usable on smaller screens.

## 8. Validation

The project was checked with JavaScript syntax validation, editor diagnostics, whitespace validation, static server delivery, and a lightweight DOM smoke test. The built-in messy example covers:

- Currency symbols and separators.
- Extra spaces and capitalization variants.
- Exact duplicate rows.
- A missing name.
- A non-numeric amount.
- A negative amount.

The expected sample report is seven valid rows, six resulting people, two duplicate rows removed, one merged name variant, three rejected rows, and ₹6,300 in cleaned contributions.

## 9. Future extensions

Unequal shares, recurring expenses, payment links, authentication, export, and multi-device collaboration are intentionally outside this version. Adding those features would require a more formal data model and likely a backend. The current design keeps the core equal-share workflow understandable, testable, and easy to deploy.