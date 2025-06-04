// src/utils/AnalyticsUtils.js - FIXED Safe Version
/**
 * Simplified Analytics utility functions - safe from errors
 */
export class AnalyticsUtils {
  /**
   * Get date range for a given period - FIXED version
   */
  static getDateRange(period, customStart = null, customEnd = null) {
    const now = new Date();

    try {
      switch (period) {
        case 'This Week':
          const startOfWeek = new Date(now);
          const day = startOfWeek.getDay();
          const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
          startOfWeek.setDate(diff);
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          return {start: startOfWeek, end: endOfWeek};

        case 'Last Week':
          const lastWeekStart = new Date(now);
          const lastWeekDay = lastWeekStart.getDay();
          const lastWeekDiff =
            lastWeekStart.getDate() -
            lastWeekDay +
            (lastWeekDay === 0 ? -6 : 1) -
            7;
          lastWeekStart.setDate(lastWeekDiff);
          lastWeekStart.setHours(0, 0, 0, 0);

          const lastWeekEnd = new Date(lastWeekStart);
          lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
          lastWeekEnd.setHours(23, 59, 59, 999);

          return {start: lastWeekStart, end: lastWeekEnd};

        case 'This Month':
          return {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: new Date(
              now.getFullYear(),
              now.getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            ),
          };

        case 'Last Month':
          return {
            start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            end: new Date(
              now.getFullYear(),
              now.getMonth(),
              0,
              23,
              59,
              59,
              999,
            ),
          };

        case 'This Quarter':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          return {
            start: new Date(now.getFullYear(), quarterStart, 1),
            end: new Date(
              now.getFullYear(),
              quarterStart + 3,
              0,
              23,
              59,
              59,
              999,
            ),
          };

        case 'This Year':
          return {
            start: new Date(now.getFullYear(), 0, 1),
            end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
          };

        case 'Custom Range':
          return {
            start:
              customStart || new Date(now.getFullYear(), now.getMonth(), 1),
            end:
              customEnd ||
              new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0,
                23,
                59,
                59,
                999,
              ),
          };

        default:
          return {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: new Date(
              now.getFullYear(),
              now.getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            ),
          };
      }
    } catch (error) {
      console.error('Error in getDateRange:', error);
      // Return safe default
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      };
    }
  }

  /**
   * Calculate simple spending trends - FIXED version
   */
  static analyzeSpendingTrends(transactions, categories) {
    const trends = {
      dailyAverage: 0,
      weeklyPattern: {},
      monthlyGrowth: 0,
      topCategories: [],
      spendingVelocity: 'normal',
      seasonalPattern: {},
      budgetEfficiency: 0,
    };

    // FIXED: Safe array checking
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return trends;
    }

    if (!Array.isArray(categories)) {
      categories = [];
    }

    try {
      // Calculate daily average safely
      const expenses = transactions.filter(
        t => t && t.type === 'expense' && typeof t.amount === 'number',
      );
      const totalExpenses = expenses.reduce(
        (sum, t) => sum + (t.amount || 0),
        0,
      );
      const daySpan = this.getDaySpan(transactions);
      trends.dailyAverage = daySpan > 0 ? totalExpenses / daySpan : 0;

      // Weekly pattern analysis - simplified
      trends.weeklyPattern = this.getWeeklyPattern(expenses);

      // Monthly growth calculation - simplified
      trends.monthlyGrowth = this.getMonthlyGrowth(expenses);

      // Top categories by spending - simplified
      trends.topCategories = this.getTopCategories(expenses, categories);

      return trends;
    } catch (error) {
      console.error('Error in analyzeSpendingTrends:', error);
      return trends;
    }
  }

  /**
   * Generate simple financial insights - FIXED version
   */
  static generateInsights(summary, historicalData, budget, categories) {
    const insights = [];

    if (!summary || typeof summary !== 'object') {
      return insights;
    }

    try {
      // Budget performance insight
      if (budget && typeof budget.amount === 'number' && budget.amount > 0) {
        const budgetUsage =
          ((summary.totalExpenses || 0) / budget.amount) * 100;
        const daysInMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0,
        ).getDate();
        const daysPassed = new Date().getDate();
        const expectedUsage = (daysPassed / daysInMonth) * 100;

        if (budgetUsage > expectedUsage + 10) {
          insights.push({
            type: 'warning',
            title: 'Budget Overspending',
            description: `You're ${(budgetUsage - expectedUsage).toFixed(
              1,
            )}% ahead of your monthly budget pace`,
            value: `${budgetUsage.toFixed(1)}%`,
            icon: 'alert-triangle',
            actionable: true,
            action: 'Review high-spending categories',
          });
        } else if (budgetUsage < expectedUsage - 5) {
          insights.push({
            type: 'success',
            title: 'Budget Discipline',
            description: `You're ${(expectedUsage - budgetUsage).toFixed(
              1,
            )}% under your monthly budget pace`,
            value: `${budgetUsage.toFixed(1)}%`,
            icon: 'check-circle',
            actionable: false,
          });
        }
      }

      // Income vs expenses insight
      const totalIncome = summary.totalIncome || 0;
      const totalExpenses = summary.totalExpenses || 0;
      const savingsRate =
        totalIncome > 0
          ? ((totalIncome - totalExpenses) / totalIncome) * 100
          : 0;

      if (savingsRate < 10 && totalIncome > 0) {
        insights.push({
          type: 'caution',
          title: 'Low Savings Rate',
          description: `Your savings rate is ${savingsRate.toFixed(
            1,
          )}%. Consider reducing expenses or increasing income`,
          value: `${savingsRate.toFixed(1)}%`,
          icon: 'trending-down',
          actionable: true,
          action: 'Review expense categories',
        });
      } else if (savingsRate >= 20) {
        insights.push({
          type: 'success',
          title: 'Excellent Savings',
          description: `Your savings rate of ${savingsRate.toFixed(
            1,
          )}% is above the recommended 20%`,
          value: `${savingsRate.toFixed(1)}%`,
          icon: 'trending-up',
          actionable: false,
        });
      }

      return insights.slice(0, 3); // Limit to top 3 insights
    } catch (error) {
      console.error('Error in generateInsights:', error);
      return [];
    }
  }

  /**
   * Predict end-of-month spending - FIXED version
   */
  static predictMonthEnd(
    currentSpending,
    daysElapsed,
    totalDaysInMonth,
    historicalPattern = null,
  ) {
    try {
      if (
        typeof currentSpending !== 'number' ||
        typeof daysElapsed !== 'number' ||
        typeof totalDaysInMonth !== 'number'
      ) {
        return 0;
      }

      if (daysElapsed <= 0 || totalDaysInMonth <= 0) {
        return 0;
      }

      // Simple linear projection
      const dailyAverage = currentSpending / daysElapsed;
      const linearProjection = dailyAverage * totalDaysInMonth;

      return Math.max(0, linearProjection);
    } catch (error) {
      console.error('Error in predictMonthEnd:', error);
      return 0;
    }
  }

  /**
   * Calculate simple financial health score - FIXED version
   */
  static calculateHealthScore(summary, budget, categories, historicalData) {
    let score = 100;
    const factors = [];

    try {
      if (!summary || typeof summary !== 'object') {
        return {
          score: 0,
          factors: [],
          grade: {grade: 'F', color: '#EF4444', description: 'No Data'},
          recommendations: ['Add transactions to calculate health score'],
        };
      }

      // Budget adherence (40 points)
      if (budget && typeof budget.amount === 'number' && budget.amount > 0) {
        const budgetUsage =
          ((summary.totalExpenses || 0) / budget.amount) * 100;
        if (budgetUsage <= 90) {
          factors.push({name: 'Budget Adherence', score: 40, max: 40});
        } else if (budgetUsage <= 100) {
          const adherenceScore = 40 - (budgetUsage - 90) * 4;
          factors.push({
            name: 'Budget Adherence',
            score: Math.max(0, adherenceScore),
            max: 40,
          });
          score -= 40 - Math.max(0, adherenceScore);
        } else {
          factors.push({name: 'Budget Adherence', score: 0, max: 40});
          score -= 40;
        }
      } else {
        factors.push({name: 'Budget Adherence', score: 20, max: 40});
        score -= 20;
      }

      // Savings rate (30 points)
      const totalIncome = summary.totalIncome || 0;
      const totalExpenses = summary.totalExpenses || 0;
      const savingsRate =
        totalIncome > 0
          ? ((totalIncome - totalExpenses) / totalIncome) * 100
          : 0;

      if (savingsRate >= 20) {
        factors.push({name: 'Savings Rate', score: 30, max: 30});
      } else if (savingsRate >= 10) {
        const savingsScore = 15 + ((savingsRate - 10) / 10) * 15;
        factors.push({name: 'Savings Rate', score: savingsScore, max: 30});
        score -= 30 - savingsScore;
      } else {
        const savingsScore = Math.max(0, savingsRate * 1.5);
        factors.push({name: 'Savings Rate', score: savingsScore, max: 30});
        score -= 30 - savingsScore;
      }

      // Basic spending control (30 points)
      const spendingScore =
        totalExpenses > 0 && totalIncome > 0
          ? Math.min(30, (1 - totalExpenses / totalIncome) * 30)
          : 15;
      factors.push({name: 'Spending Control', score: spendingScore, max: 30});
      score -= 30 - spendingScore;

      const finalScore = Math.max(0, Math.min(100, score));

      return {
        score: finalScore,
        factors,
        grade: this.getHealthGrade(finalScore),
        recommendations: this.getHealthRecommendations(factors),
      };
    } catch (error) {
      console.error('Error in calculateHealthScore:', error);
      return {
        score: 0,
        factors: [],
        grade: {grade: 'F', color: '#EF4444', description: 'Error'},
        recommendations: ['Error calculating health score'],
      };
    }
  }

  // Helper methods - FIXED versions
  static getDaySpan(transactions) {
    try {
      if (!Array.isArray(transactions) || transactions.length === 0) return 1;

      const validTransactions = transactions.filter(t => t && t.date);
      if (validTransactions.length === 0) return 1;

      const dates = validTransactions
        .map(t => new Date(t.date))
        .filter(d => !isNaN(d.getTime()));
      if (dates.length === 0) return 1;

      const earliest = new Date(Math.min(...dates));
      const latest = new Date(Math.max(...dates));

      return Math.max(
        1,
        Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24)),
      );
    } catch (error) {
      console.error('Error in getDaySpan:', error);
      return 1;
    }
  }

  static getWeeklyPattern(expenses) {
    const pattern = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0};

    try {
      if (!Array.isArray(expenses)) return pattern;

      expenses.forEach(expense => {
        if (expense && expense.date && typeof expense.amount === 'number') {
          const date = new Date(expense.date);
          if (!isNaN(date.getTime())) {
            const day = date.getDay();
            pattern[day] += expense.amount;
          }
        }
      });
    } catch (error) {
      console.error('Error in getWeeklyPattern:', error);
    }

    return pattern;
  }

  static getMonthlyGrowth(expenses) {
    try {
      if (!Array.isArray(expenses) || expenses.length === 0) return 0;

      const monthlyTotals = {};

      expenses.forEach(expense => {
        if (expense && expense.date && typeof expense.amount === 'number') {
          const date = new Date(expense.date);
          if (!isNaN(date.getTime())) {
            const monthKey = `${date.getFullYear()}-${String(
              date.getMonth() + 1,
            ).padStart(2, '0')}`;
            monthlyTotals[monthKey] =
              (monthlyTotals[monthKey] || 0) + expense.amount;
          }
        }
      });

      const months = Object.keys(monthlyTotals).sort();
      if (months.length < 2) return 0;

      const currentMonth = monthlyTotals[months[months.length - 1]];
      const previousMonth = monthlyTotals[months[months.length - 2]];

      return previousMonth > 0
        ? ((currentMonth - previousMonth) / previousMonth) * 100
        : 0;
    } catch (error) {
      console.error('Error in getMonthlyGrowth:', error);
      return 0;
    }
  }

  static getTopCategories(expenses, categories) {
    try {
      if (!Array.isArray(expenses) || !Array.isArray(categories)) return [];

      const categoryTotals = {};

      expenses.forEach(expense => {
        if (expense && expense.category && typeof expense.amount === 'number') {
          categoryTotals[expense.category] =
            (categoryTotals[expense.category] || 0) + expense.amount;
        }
      });

      const totalExpenses = Object.values(categoryTotals).reduce(
        (sum, amount) => sum + amount,
        0,
      );
      if (totalExpenses === 0) return [];

      return Object.entries(categoryTotals)
        .map(([categoryId, amount]) => ({
          category: categories.find(c => c && c.id === categoryId) || {
            name: 'Unknown',
          },
          amount,
          percentage: (amount / totalExpenses) * 100,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
    } catch (error) {
      console.error('Error in getTopCategories:', error);
      return [];
    }
  }

  static getHealthGrade(score) {
    try {
      if (typeof score !== 'number') score = 0;

      if (score >= 90)
        return {grade: 'A+', color: '#10B981', description: 'Excellent'};
      if (score >= 80)
        return {grade: 'A', color: '#10B981', description: 'Very Good'};
      if (score >= 70)
        return {grade: 'B', color: '#F59E0B', description: 'Good'};
      if (score >= 60)
        return {grade: 'C', color: '#F59E0B', description: 'Fair'};
      if (score >= 50)
        return {grade: 'D', color: '#EF4444', description: 'Poor'};
      return {grade: 'F', color: '#EF4444', description: 'Very Poor'};
    } catch (error) {
      console.error('Error in getHealthGrade:', error);
      return {grade: 'F', color: '#EF4444', description: 'Error'};
    }
  }

  static getHealthRecommendations(factors) {
    const recommendations = [];

    try {
      if (!Array.isArray(factors)) return recommendations;

      factors.forEach(factor => {
        if (
          factor &&
          typeof factor.score === 'number' &&
          typeof factor.max === 'number'
        ) {
          const percentage = (factor.score / factor.max) * 100;

          if (percentage < 50) {
            switch (factor.name) {
              case 'Budget Adherence':
                recommendations.push(
                  'Review and adjust your budget categories',
                );
                break;
              case 'Savings Rate':
                recommendations.push(
                  'Increase income or reduce unnecessary expenses',
                );
                break;
              case 'Spending Control':
                recommendations.push('Track daily expenses more carefully');
                break;
            }
          }
        }
      });

      return recommendations.slice(0, 3); // Top 3 recommendations
    } catch (error) {
      console.error('Error in getHealthRecommendations:', error);
      return ['Error generating recommendations'];
    }
  }
}

export default AnalyticsUtils;
