"use client";

import { useState } from "react";
import { sendKeywords, sendSelectedKeywords, checkKeywordInDB } from "./action";
import KeywordTable from "./KeywordTable";
import { useRouter } from "next/navigation";


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
  exists: boolean;
  participation?: number;
  category?: string;
  img?: string;
}

const KeywordSearch: React.FC = () => {
  const [keyword, setKeyword] = useState<string>("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [results, setResults] = useState<KeywordData[]>([]);
  const [checkedStates, setCheckedStates] = useState<boolean[]>([]);
  const [allChecked, setAllCheckedState] = useState(false);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const userId = "test_user"; // 임시 사용자 ID
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]); // 체크한 순서를 저장하는 상태

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && keyword.trim() !== "") {
      if (keywords.length >= 5) {
        alert("최대 5개의 키워드만 추가할 수 있습니다.");
        return null;
      }
  
      if (keywords.some((kw) => kw.relKeyword === keyword.trim())) {
        alert("이미 추가된 키워드입니다.");
        return null;
      }
  
      try {
        // 키워드의 모든 공백 제거
        const sanitizedKeyword = keyword.replace(/\s+/g, "");
  
        const { exists, data } = await checkKeywordInDB(sanitizedKeyword);
  
        const newKeyword: KeywordData = {
          relKeyword: sanitizedKeyword, // 공백이 제거된 키워드
          monthlyPcQcCnt: 0,
          monthlyMobileQcCnt: 0,
          monthlyAvePcClkCnt: 0,
          monthlyAveMobileClkCnt: 0,
          monthlyAvePcCtr: 0,
          monthlyAveMobileCtr: 0,
          plAvgDepth: 0,
          compIdx: "",
          exists: exists,
          participation: exists ? data?.participation : undefined,
          category: exists ? data?.category : undefined,
          img: exists ? data?.img : undefined,
        };
  
        setKeywords((prev) => [...prev, newKeyword]);
        setKeyword("");
  
        return { exists, data }; // 함수에서 반환
      } catch (error) {
        console.error("키워드 조회 중 오류:", error);
        alert("키워드 조회 중 문제가 발생했습니다.");
        return null;
      }
    }
  };
  



  const handleSearch = async () => {
    if (keywords.length === 0) {
      alert("키워드를 최소 1개 이상 추가해주세요.");
      return;
    }

    try {
      // string[] 형식만 전달
      const keywordStrings = keywords.map((kw) => kw.relKeyword);
      const response = await sendKeywords(keywordStrings);
  
      setResults(response);
      setCheckedStates(Array(response.length).fill(false));
    } catch (error) {
      console.error("키워드 검색 실패:", error);
      alert("키워드 검색 중 문제가 발생했습니다.");
    }
  };
  

  // const handleCheckboxChange = (index: number) => {
  //   const updatedStates = [...checkedStates];
  //   updatedStates[index] = !updatedStates[index];
  //   setCheckedStates(updatedStates);

  //   const isAllChecked = updatedStates.every((state) => state);
  //   setAllCheckedState(isAllChecked);
  // };
  const handleCheckboxChange = (index: number) => {
    const updatedStates = [...checkedStates];
    updatedStates[index] = !updatedStates[index];
    setCheckedStates(updatedStates);
  
    const keyword = results[index].relKeyword;
  
    setSelectedOrder((prevOrder) => {
      if (updatedStates[index]) {
        return [...prevOrder, keyword]; // 체크되면 순서 추가
      } else {
        return prevOrder.filter((item) => item !== keyword); // 해제되면 제거
      }
    });
  
    const isAllChecked = updatedStates.every((state) => state);
    setAllCheckedState(isAllChecked);
  };

  const handleAllCheckboxChange = (checked: boolean) => {
    setAllCheckedState(checked);
    setCheckedStates(Array(results.length).fill(checked));
  };

  // const handleSearchClick = async () => {
  //   const selectedKeywords = results
  //     .filter((_, index) => checkedStates[index])
  //     .map((result) => result.relKeyword);
  
  //   if (selectedKeywords.length === 0) {
  //     alert("최소 하나 이상의 키워드를 선택하세요.");
  //     return;
  //   }
  
  //   try {
  //     setIsLoading(true); // 로딩 상태 활성화
  
  //     // 서버 요청 및 응답 받기
  //     const responseData = await sendSelectedKeywords(userId, selectedKeywords);
  //     console.log("서버 응답 데이터:", responseData); // 서버 응답 확인
  
  //     // 기존 데이터 저장
  //     sessionStorage.setItem("keywordRankingData", JSON.stringify(responseData));
  
  //     // 추가 데이터 매핑
  //     const extraData = keywords.map((kw) => ({
  //       exists: kw.exists,
  //       participation: kw.participation ?? 0, // 참여도 값이 없으면 0으로 설정
  //       category: kw.category ?? "N/A", // 카테고리가 없으면 기본값
  //       img: kw.img ?? "", // 이미지가 없으면 빈 문자열
  //     }));

  //     console.log("추추 데이터:", extraData); // 매핑된 추가 데이터 확인
  
  //     // 추가 데이터를 저장
  //     sessionStorage.setItem("extraKeywordData", JSON.stringify(extraData));
  
  //     // 페이지 이동
  //     router.push("/keyword_ranking");
  //   } catch (error) {
  //     console.error("데이터 전송 에러:", error);
  //     alert("서버 요청 중 문제가 발생했습니다.");
  //   } finally {
  //     setIsLoading(false); // 로딩 상태 해제
  //   }
  // };
  const handleSearchClick = async () => {
    if (selectedOrder.length === 0) {
      alert("최소 하나 이상의 키워드를 선택하세요.");
      return;
    }
  
    try {
      setIsLoading(true); // 로딩 상태 활성화
  
      // 서버 요청 및 응답 받기
      const responseData = await sendSelectedKeywords(userId, selectedOrder);
      console.log("서버 응답 데이터:", responseData); // 서버 응답 확인
  
      // 기존 데이터 저장
      sessionStorage.setItem("keywordRankingData", JSON.stringify(responseData));
  
      // ✅ 체크된 키워드에 해당하는 extraData만 필터링
      const filteredExtraData = keywords
        .filter((kw) => selectedOrder.includes(kw.relKeyword)) // 선택된 키워드만 포함
        .map((kw) => ({
          exists: kw.exists,
          participation: kw.participation ?? 0, // 참여도 값이 없으면 0으로 설정
          category: kw.category ?? "N/A", // 카테고리가 없으면 기본값
          img: kw.img ?? "", // 이미지가 없으면 빈 문자열
        }));
  
      console.log("필터링된 추가 데이터:", filteredExtraData); // 필터링된 추가 데이터 확인
  
      // ✅ 필터링된 데이터만 저장
      sessionStorage.setItem("extraKeywordData", JSON.stringify(filteredExtraData));
  
      // 페이지 이동
      router.push("/keyword_ranking");
    } catch (error) {
      console.error("데이터 전송 에러:", error);
      alert("서버 요청 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false); // 로딩 상태 해제
    }
  };
  
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1 className="text-6xl mb-8">키워드 조회</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginBottom: "20px", color:"black" }}>
        {keywords.map((kw, index) => (
          <div
            key={index}
            style={{
              position: "relative", // X 버튼 위치 조정을 위해 설정
              display: "inline-block",
              padding: "15px 20px",
              backgroundColor: kw.exists ? "#d4edda" : "#e9ecef", // 키워드 존재 여부에 따라 색상
              borderRadius: "15px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)", // 그림자 추가
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "visible", // X 버튼이 잘리지 않도록 설정
            }}
          >
            {/* X 버튼 */}
            <button
              onClick={() => setKeywords((prev) => prev.filter((_, i) => i !== index))}
              style={{
                position: "absolute", // 버튼을 태그의 상단에 걸쳐 배치
                top: "-8px", // 상단에 걸친 위치
                right: "-8px", // 오른쪽에 걸친 위치
                width: "24px",
                height: "24px",
                backgroundColor: "red",
                border: "none",
                borderRadius: "50%",
                color: "white",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)", // 버튼 그림자 추가
              }}
            >
              ✖
            </button>

            {/* 텍스트 */}
            <p
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                margin: "0 0 5px 0",
              }}
            >
              {kw.relKeyword}{" "}
              <span style={{ fontSize: "14px", color: "#6c757d" }}>
                &gt; {kw.category ?? "N/A"}
              </span>
            </p>
            {kw.exists && (
              <p
                style={{
                  fontSize: "14px",
                  color: "#495057",
                  margin: "0",
                }}
              >
                참여수: {kw.participation ?? 0}명
              </p>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: "50px" }}>
        <input
          type="text"
          placeholder="Enter를 누르면 조회할 키워드가 추가됩니다."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown} // Enter 키로 추가 및 조회
          style={{
            padding: "12px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            width: "400px",
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            marginLeft: "10px",
            padding: "10px 30px",
            borderRadius: "10px",
            backgroundColor: "#2D3539",
            color: "#1EC800",
            cursor: "pointer",
            fontSize: "20px",
          }}
        >
        NAVER 검색광고 조회
        </button>
      </div>
      <>
        {results.length > 0 && (
          <>
            <KeywordTable
              results={results}
              checkedStates={checkedStates}
              allChecked={allChecked}
              handleCheckboxChange={handleCheckboxChange}
              handleAllCheckboxChange={handleAllCheckboxChange}
            />
            {!isLoading && ( // 로딩 중이 아닐 때만 버튼 표시
              <button
                onClick={handleSearchClick}
                style={{
                  marginTop: "20px",
                  marginBottom: "50px",
                  padding: "10px 20px",
                  fontSize: "20px",
                  backgroundColor: "#1EC800",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                네이버 검색하여 순위 추출하기
              </button>
            )}
          </>
        )}
        {isLoading && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}>
            {[0, 1, 2].map((dot) => (
              <div
                key={dot}
                style={{
                  width: "10px",
                  height: "10px",
                  margin: "0 5px",
                  marginBottom: "100px",
                  backgroundColor: "#1EC800",
                  borderRadius: "50%",
                  animation: `bounce 0.6s ease-in-out ${dot * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}
        <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
      </>
    </div>
  );
};

export default KeywordSearch;
