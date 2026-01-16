{
  type: 'monthly',
  data: monthlyData.map((item) => ({
    date: new Date(item.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }),
    value: item.value
  }))
} 