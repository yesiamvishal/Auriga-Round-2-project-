# Reasoning

## Problem framing

The organiser needs three answers at a glance:

1. How much was collected, and is the target reached?
2. What is each person's fair share and current balance?
3. What is the simplest practical list of payments to finish?

The first version therefore focuses on equal shares and simple cash balances. It does not introduce accounts, sign-in, permissions, or a backend because those would slow down the real task and make deployment harder.

## Product choices

- The farewell-gift example is available immediately, so the main scenario is understandable without setup.
- Pool name and target amount are editable, making the tool reusable for any organiser or shared expense.
- Each person has one paid amount. Their balance is `paid - equal share`: a negative value means they still owe, while a positive value means they are owed money back.
- Summary cards answer the organiser's recurring questions before they need to inspect the people list.
- A compact settlement panel translates balances into direct transfers, avoiding a long chain of repayments.
- Data is saved to `localStorage`. This keeps the app useful on refresh while preserving the no-backend, static-hosting requirement.

## Settlement algorithm

The app creates two lists from the balances: debtors with negative balances and creditors with positive balances. It sorts both by absolute balance, then repeatedly matches the largest remaining debtor with the largest remaining creditor. Each transfer is the smaller of those two amounts. Once one side reaches zero, the next person is matched.

This greedy approach produces a short, easy-to-follow list for the app's equal-share use case. It also handles partial payments, overpayments, unpaid people, and a pool that has already exceeded its target.

## Scope and trade-offs

The app intentionally leaves out recurring expenses, unequal shares, payment links, authentication, and multi-device collaboration. Those are useful future extensions, but they would need a clear data model and a server. For a first usable version that can be built and deployed in under an hour, plain HTML, CSS, and JavaScript is the most reliable choice.

## Validation approach

The sample data covers full, partial, zero, and extra payments. Manual browser checks should verify that changing a payment updates the balance and settlement plan, adding/removing people changes the equal share, refresh preserves data, and reset returns to an empty pool.