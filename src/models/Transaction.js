class Transaction {
    constructor(id, amount, category, description, date, isIncome) {
      this.id = id;
      this.amount = amount;
      this.category = category;
      this.description = description;
      this.date = date;
      this.isIncome = isIncome;
    }
  }