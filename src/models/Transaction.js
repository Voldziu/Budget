class Transaction {
  constructor(id, amount, category, description, date, isIncome, recurring = false, frequency = null, customFrequency = null) {
    this.id = id;
    this.amount = amount;
    this.category = category;
    this.description = description;
    this.date = date;
    this.isIncome = isIncome;
    this.recurring = recurring;
    this.frequency = frequency; // 'daily', 'weekly', 'monthly', 'custom'
    this.customFrequency = customFrequency; // { times: number, period: 'day'|'week'|'month' }
  }
}