class Transaction {
  constructor(id, 
    amount, 
    category, 
    description,
    date, 
    is_income, 
    recurring = false, 
    frequency = null, 
    customFrequency = null,
    //receiptImage = null,
    is_parent = false,
    parent_id = null
  ) {
    this.id = id;
    this.amount = amount;
    this.category = category;
    this.description = description;
    this.date = date;
    this.is_income = is_income;
    this.recurring = recurring;
    this.frequency = frequency; // 'daily', 'weekly', 'monthly', 'custom'
    this.customFrequency = customFrequency; // { times: number, period: 'day'|'week'|'month' }
    //this.receiptImage = receiptImage;
    this.is_parent = is_parent;
    this.parent_id = parent_id;
  }
}