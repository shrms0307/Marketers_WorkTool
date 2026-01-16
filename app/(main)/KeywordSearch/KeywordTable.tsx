"use client";

import { useState, useEffect } from "react";

interface KeywordData {
  relKeyword: string;
  monthlyPcQcCnt: number;
  monthlyMobileQcCnt: number;
  monthlyAvePcClkCnt: number;
  monthlyAveMobileClkCnt: number;
  monthlyAvePcCtr: number;
  monthlyAveMobileCtr: number;
  plAvgDepth: number;
  compIdx: string;
}

interface KeywordTableProps {
  results: KeywordData[];
  checkedStates: boolean[];
  allChecked: boolean;
  handleCheckboxChange: (index: number) => void;
  handleAllCheckboxChange: (checked: boolean) => void;
}

const KeywordTable: React.FC<KeywordTableProps> = ({
  results,
  checkedStates,
  allChecked,
  handleCheckboxChange,
  handleAllCheckboxChange,
}) => {
  const [sortedColumn, setSortedColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [sortedResults, setSortedResults] = useState<KeywordData[]>(results);
  const [indexMap, setIndexMap] = useState<number[]>(results.map((_, i) => i)); // 원래 인덱스를 추적하는 배열

  useEffect(() => {
    setSortedResults(results);
    setIndexMap(results.map((_, i) => i)); // 초기 상태에서 원래 인덱스 유지
  }, [results]);

  const handleSort = (column: keyof KeywordData) => {
    const isAscending = sortedColumn === column && sortDirection === "asc";
    const newDirection = isAscending ? "desc" : "asc";
    setSortedColumn(column);
    setSortDirection(newDirection);

    // 원래 인덱스를 추적하면서 정렬 수행
    const combined = sortedResults.map((item, index) => ({ item, originalIndex: indexMap[index] }));
    combined.sort((a, b) => {
      if (a.item[column] < b.item[column]) return newDirection === "asc" ? -1 : 1;
      if (a.item[column] > b.item[column]) return newDirection === "asc" ? 1 : -1;
      return 0;
    });

    setSortedResults(combined.map((entry) => entry.item));
    setIndexMap(combined.map((entry) => entry.originalIndex)); // 정렬 후 인덱스 업데이트
  };

  return (
    <table
      style={{
        margin: "20px auto",
        borderCollapse: "collapse",
        width: "80%",
        textAlign: "center",
      }}
    >
      <thead>
        <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd", color: "black" }}>
          <th style={{ padding: "10px", border: "1px solid #ddd", position: "relative" }}>
            <div className="tooltip-container">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => handleAllCheckboxChange(e.target.checked)}
                style={{ transform: "scale(1.2)", cursor: "pointer" }}
              />
              <span className="tooltip-text">전체 선택할 수 있습니다.</span>
            </div>
          </th>
          {[
            { key: "relKeyword", label: "키워드", tooltip: "검색된 키워드입니다." },
            { key: "monthlyPcQcCnt", label: "PC 검색량", tooltip: "PC에서의 최근 월간 검색 수입니다." },
            { key: "monthlyMobileQcCnt", label: "모바일 검색량", tooltip: "모바일에서의 최근 월간 검색 수입니다." },
            { key: "monthlyAvePcClkCnt", label: "PC 클릭수", tooltip: "PC에서의 최근 월간 클릭 수입니다." },
            { key: "monthlyAveMobileClkCnt", label: "모바일 클릭수", tooltip: "모바일에서의 최근 월간 클릭 수입니다." },
            { key: "monthlyAvePcCtr", label: "PC 클릭률", tooltip: "PC에서의 최근 4주간 평균 클릭률입니다." },
            { key: "monthlyAveMobileCtr", label: "모바일 클릭률", tooltip: "모바일에서의 최근 4주간 평균 클릭률입니다." },
            { key: "plAvgDepth", label: "노출 순위", tooltip: "최근 4주 동안의 PC 광고 평균 노출 위치입니다." },
            { key: "compIdx", label: "경쟁 정도", tooltip: "키워드의 경쟁 정도를 나타냅니다." },
          ].map(({ key, label, tooltip }) => (
            <th key={key} className="tooltip-header" style={{ position: "relative", padding: "10px", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{label}</span>
                <span
                  onClick={() => handleSort(key as keyof KeywordData)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    fontSize: "12px",
                    marginLeft: "10px",
                  }}
                >
                  <span style={{ lineHeight: "10px" }}>{sortedColumn === key && sortDirection === "asc" ? "▲" : "△"}</span>
                  <span style={{ lineHeight: "10px" }}>{sortedColumn === key && sortDirection === "desc" ? "▼" : "▽"}</span>
                </span>
              </div>
              <span className="tooltip-text">{tooltip}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedResults.map((result, index) => (
          <tr key={index} style={{ borderBottom: "1px solid #ddd", transition: "background-color 0.2s" }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#56BFF2"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ""}
          >
            <td style={{ padding: "10px", border: "1px solid #ddd" }}>
              <input
                type="checkbox"
                checked={checkedStates[indexMap[index]]} // 원래 인덱스를 기반으로 체크박스 상태 유지
                onChange={() => handleCheckboxChange(indexMap[index])} // 원래 배열에서 해당 체크박스 업데이트
                style={{
                  transform: "scale(1.2)",
                  cursor: "pointer",
                }}
              />
            </td>
            <td style={{ padding: "10px", border: "1px solid #ddd" }}>{result.relKeyword}</td>
            <td style={{ padding: "10px", border: "1px solid #ddd" }}>{result.monthlyPcQcCnt}</td>
            <td style={{ padding: "10px", border: "1px solid #ddd" }}>{result.monthlyMobileQcCnt}</td>
            <td style={{ padding: "10px", border: "1px solid #ddd" }}>{result.monthlyAvePcClkCnt}</td>
            <td style={{ padding: "10px", border: "1px solid #ddd" }}>{result.monthlyAveMobileClkCnt}</td>
            <td style={{ padding: "10px", border: "1px solid #ddd" }}>{result.monthlyAvePcCtr}</td>
            <td style={{ padding: "10px", border: "1px solid #ddd" }}>{result.monthlyAveMobileCtr}</td>
            <td style={{ padding: "10px", border: "1px solid #ddd" }}>{result.plAvgDepth}</td>
            <td style={{ padding: "10px", border: "1px solid #ddd" }}>{result.compIdx}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default KeywordTable;
