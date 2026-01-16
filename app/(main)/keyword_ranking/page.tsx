"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Modal from "@/components/modal/Modal"; // 모달 컴포넌트 가져오기
import { sendInLink } from "../KeywordSearch/action"; // 서버 요청 함수
import { getBlogAnalysis } from "@/app/(main)/blog-analysis/actions";
import rankingTable from "./rankingTable";
import { CreateProjectDialog } from "./create-project-dialog"


interface CreateProjectDialogProps {
  selectedBloggers: string[]
  onSuccess: () => void
}

const KeywordRanking = () => {
  const router = useRouter();
  const [data, setData] = useState<KeywordRankData[]>([]);
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가
  const [modalData, setModalData] = useState<any>(null); // 모달 데이터
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InfluencerData | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [filter, setFilter] = useState<"blog" | "influencer">("blog");
  const [extraData, setExtraData] = useState([]); // 추가 데이터 (카테고리, 참여도 등)
  // 🔹 useRef로 선택된 행을 저장 (리렌더링 방지)
  const selectedRows = useRef<{ [keyword: string]: { blog: number[]; influencer: number[] } }>({});

    // 🔹 useState를 추가하여 강제 리렌더링 트리거
  const [stateSelectedRows, setStateSelectedRows] = useState({ ...selectedRows.current });

  useEffect(() => {
    // 🔹 sessionStorage에서 기존 데이터 및 추가 데이터 가져오기
    const storedCombinedData = sessionStorage.getItem("keywordRankingData");
    const storedExtraData = sessionStorage.getItem("extraKeywordData");
    const storedSelectedRows = sessionStorage.getItem("selectedRows");
  
    if (storedCombinedData) {
      try {
        const parsedData = JSON.parse(storedCombinedData);
        const combinedData = parsedData.keyword.map((keyword: string, index: number) => ({
          keyword,
          rank: parsedData.rank[index],
        }));
  
        setData(prevData => {
          if (JSON.stringify(prevData) !== JSON.stringify(combinedData)) {
            console.log("기존 데이터 업데이트됨:", combinedData);
            return combinedData;
          }
          return prevData;
        });
      } catch (error) {
        console.error("기존 데이터 파싱 에러:", error);
      }
    }
  
    if (storedExtraData) {
      try {
        const parsedExtraData = JSON.parse(storedExtraData);
        setExtraData(prevExtraData => {
          if (JSON.stringify(prevExtraData) !== JSON.stringify(parsedExtraData)) {
            console.log("추가 데이터 업데이트됨:", parsedExtraData);
            return parsedExtraData;
          }
          return prevExtraData;
        });
      } catch (error) {
        console.error("추가 데이터 파싱 에러:", error);
      }
    }
  
    if (storedSelectedRows) {
      try {
        const parsedSelectedRows = JSON.parse(storedSelectedRows);
        selectedRows.current = parsedSelectedRows;
        console.log("✅ 선택된 데이터 복원됨:", selectedRows.current);
      } catch (error) {
        console.error("선택된 데이터 파싱 에러:", error);
      }
    }
  }, []); // ✅ 최초 1회 실행
  
  // 🔹 키워드 탭 변경 시 선택된 데이터 즉시 반영
  useEffect(() => {
    if (data.length === 0) return;
  
    const keyword = data[activeTab]?.keyword || "";
    if (!keyword) return;
  
    if (!selectedRows.current[keyword]) {
      selectedRows.current[keyword] = { blog: [], influencer: [] };
    }
  
    const selectedState = selectedRows.current[keyword];
  
    setStateSelectedRows((prevState) => ({
      ...prevState,
      [keyword]: selectedState,
    }));
  
    // 🔹 sessionStorage에도 저장하여 새로고침해도 유지됨
    sessionStorage.setItem("selectedRows", JSON.stringify(selectedRows.current));
  
  }, [activeTab, data.length, filter]); // ✅ `filter` 추가하여 변경 감지
  
  
  
  
  
  

  const filteredData = useMemo(() => {
    return filter === "blog"
      ? data[activeTab]?.rank?.blog ?? []
      : data[activeTab]?.rank?.influencer ?? [];
  }, [data, activeTab, filter]);


  const handleRowSelect = useCallback((index: number) => {
    const keyword = data[activeTab]?.keyword || "";
    if (!keyword) return;
  
    // 🔹 키워드별 선택 상태 초기화
    if (!selectedRows.current[keyword]) {
      selectedRows.current[keyword] = { blog: [], influencer: [] };
    }
  
    const currentSelection = selectedRows.current[keyword][filter] || [];
    const newSelection = currentSelection.includes(index)
      ? currentSelection.filter((i) => i !== index) // 선택 취소
      : [...currentSelection, index]; // 선택 추가
  
    if (JSON.stringify(currentSelection) !== JSON.stringify(newSelection)) {
      selectedRows.current[keyword][filter] = newSelection;
  
      // 🔹 모든 키워드의 선택 상태 유지
      setStateSelectedRows((prevState) => ({
        ...prevState,
        [keyword]: { ...selectedRows.current[keyword] },
      }));
  
      console.log(`✅ 키워드 "${keyword}" 선택된 행 업데이트:`, selectedRows.current);
  
      // 🔹 선택된 상태를 sessionStorage에 저장 (새로고침해도 유지됨)
      sessionStorage.setItem("selectedRows", JSON.stringify(selectedRows.current));
    }
  }, [filter, activeTab, data]);


  
  const handleSelectAll = useCallback((isChecked: boolean) => {
    const keyword = data[activeTab]?.keyword; // 🔹 함수 내부에서 keyword 정의
    if (!keyword) return;
  
    if (!selectedRows.current[keyword]) {
      selectedRows.current[keyword] = { blog: [], influencer: [] };
    }
  
    selectedRows.current[keyword][filter] = isChecked ? filteredData.map((_, idx) => idx) : [];
  
    setStateSelectedRows({ ...selectedRows.current[keyword] });
  
    console.log(`✅ 키워드 "${keyword}" 전체 선택됨:`, selectedRows.current[keyword]);
  }, [filter, activeTab, filteredData, data]);



  const extractBlogIdFromSelection = () => {
    const allSelectedNames: string[] = [];
  
    Object.keys(selectedRows.current).forEach((keyword) => {
      if (!selectedRows.current[keyword]) return;
  
      const selectedBlogIndexes = selectedRows.current[keyword]?.blog || [];
      const selectedInfluencerIndexes = selectedRows.current[keyword]?.influencer || [];
  
      // ✅ 해당 키워드 데이터 찾기
      const keywordData = data.find((d) => d.keyword === keyword);
      if (!keywordData) return;
  
      const blogData = keywordData?.rank?.blog ?? [];
      const influencerData = keywordData?.rank?.influencer ?? [];
  
      selectedBlogIndexes.forEach((index) => {
        const name = blogData[index]?.name; // ✅ 블로그는 name 값
        if (name) allSelectedNames.push(name);
      });
  
      selectedInfluencerIndexes.forEach((index) => {
        const bName = influencerData[index]?.b_name; // ✅ 인플루언서는 b_name 값
        if (bName) allSelectedNames.push(bName);
      });
    });
  
    console.log("🔹 선택된 모든 블로거 및 인플루언서 이름 목록:", allSelectedNames);
    return allSelectedNames;
  };
  

  

  const handleBlogDetailClick = async (blogId: string) => {
    try {
      const response = await getBlogAnalysis(blogId);
      
      if (typeof window !== "undefined") {
        sessionStorage.setItem("blogAnalysisData", JSON.stringify(response));
      }
  
      router.push(`/blog-analysis/${blogId}`);
    } catch (error) {
      console.error("블로그 데이터 가져오기 실패:", error);
      alert("블로그 데이터를 가져오는 중 문제가 발생했습니다.");
    }
  };
  

  const handleInfluencerDetailClick = async (inLink: string) => {
    if (!inLink) {
      alert("유효하지 않은 링크입니다.");
      return;
    }

    try {
      setIsLoading(true); // 로딩 시작
      const response = await sendInLink(inLink); // 서버에 in_link 전송
      setModalData(response); // 응답 데이터를 모달 데이터로 설정
      setIsModalOpen(true); // 모달 열기
    } catch (error) {
      console.error("상세보기 요청 실패:", error);
      alert("서버 요청 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false); // 로딩 종료
    }

  };
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>키워드 랭킹</h1>
        <p>데이터를 불러오는 중입니다...</p>
      </div>
    );
  };
  
  
  

  const closeModal = () => {
    setSelectedItem(null); // 선택된 데이터 초기화
    setIsModalOpen(false); // 모달 닫기
  };

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>키워드 랭킹</h1>
        <p>데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  const extractBlogId = (url: string): string => {
    try {
      const parts = url.split("/");
      return parts[3]; // blogid가 URL의 세 번째 요소에 위치
    } catch (error) {
      console.error("BlogID 추출 실패:", error);
      return "";
    }
  };
  
  const currentKeywordData = data[activeTab];
      

  return (
    <div style={{ padding: "20px" }}>
      {/* 키워드 탭 및 필터 */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        {/* 탭 리스트 */}
        <div style={{ display: "flex", gap: "1px" }}>
          {data.map((keywordData, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px",
                border: activeTab === index ? "2px solid #56BFF2" : "1px solid #ddd",
                backgroundColor: activeTab === index ? "#56BFF2" : "#f8f9fa",
                color: activeTab === index ? "#fff" : "#000",
                cursor: "pointer",
                width: "auto", // 텍스트 길이에 따라 자동 조정
                minWidth: "100px", // 최소 크기 설정 (너무 작아지는 것 방지)
                maxWidth: "100%", // 너무 커지지 않도록 제한
                height: "80px",
                textAlign: "left",
                borderRadius: "5px",
                boxShadow: activeTab === index ? "0 4px 8px rgba(0, 0, 0, 0.1)" : "none",
                flexShrink: 0, // 탭 크기가 줄어들지 않도록 설정
                whiteSpace: "nowrap", // 텍스트 줄바꿈 방지
              }}
            >
              {/* 이미지 */}
              {/* {extraData[index]?.img && (
                <img
                  src={decodeURIComponent(extraData[index]?.img)}
                  alt={`이미지`}
                  style={{
                    width: "70px",
                    height: "70px",
                    objectFit: "cover",
                    borderRadius: "5px",
                    marginRight: "10px",
                  }}
                  onError={() => console.error("이미지 로드 실패:", extraData[index]?.img)}
                  onLoad={() => console.log("이미지 로드 성공:", extraData[index]?.img)}
                />
              )} */}
              {/* 텍스트 정보 */}
              <div>
                <p style={{ margin: 0, fontWeight: "bold", fontSize: "16px" }}>
                  {keywordData.keyword} {">"} {extraData[index]?.category || "N/A"}
                </p>
                <p style={{ margin: "5px 0", fontSize: "14px" }}>
                  참여수: {extraData[index]?.participation || 0}
                </p>
              </div>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <CreateProjectDialog 
          selectedBloggers={extractBlogIdFromSelection()} // ✅ 키워드별 선택 데이터 적용
          onSuccess={() => {
            const keyword = data[activeTab]?.keyword;
            if (!keyword) return;
            console.log(`✅ 키워드 "${keyword}" 프로젝트 생성 완료, 선택된 행 초기화`);
            
            selectedRows.current[keyword] = { blog: [], influencer: [] }; // ✅ 키워드별 선택 초기화
            setStateSelectedRows({ ...selectedRows.current[keyword] });
          }}
        />
        <br></br>
          {/* 블로그 버튼 */}
          <button
            onClick={() => setFilter("blog")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "5px",
              width: "50px",
              height: "50px",
              border: filter === "blog" ? "2px solid #1EC800" : "1px solid #ddd",
              backgroundColor: filter === "blog" ? "#AFE2F5" : "#fff",
              borderRadius: "50%", // 원형 버튼
              cursor: "pointer",
            }}
          >
            <img
              src="/images/icons/blog.png"
              alt="블로그"
              style={{
                width: "40px",
                height: "40px",
                objectFit: "contain",
              }}
            />
          </button>

          {/* 인플루언서 버튼 */}
          <button
            onClick={() => setFilter("influencer")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "5px",
              width: "50px",
              height: "50px",
              border: filter === "influencer" ? "2px solid #1EC800" : "1px solid #ddd",
              backgroundColor: filter === "influencer" ? "#AFE2F5" : "#fff",
              borderRadius: "50%", // 원형 버튼
              cursor: "pointer",
            }}
          >
            <img
              src="/images/icons/inb.png"
              alt="인플루언서"
              style={{
                width: "40px",
                height: "40px",
                objectFit: "contain",
              }}
            />
          </button>
        </div>

      </div>

      {/* 테이블 */}
      <table style={{ width: "100%", borderCollapse: "collapse", margin: "0 auto" }}>
        <thead>
          <tr style={{ backgroundColor: "#f8f9fa" }}>
            <th style={{ padding: "10px", border: "1px solid #ddd" }}>
            <input 
              type="checkbox"
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
            </th>
            <th style={{ padding: "10px", border: "1px solid #ddd", color: "black", fontWeight: "bold" }}>닉네임</th>
            <th style={{ padding: "10px", border: "1px solid #ddd", color: "black", fontWeight: "bold" }}>제목</th>
            <th style={{ padding: "10px", border: "1px solid #ddd", color: "black", fontWeight: "bold", textAlign: "center" }}>카테고리</th>
            <th style={{ padding: "10px", border: "1px solid #ddd", color: "black", fontWeight: "bold", textAlign: "center" }}>이웃수</th>
            <th style={{ padding: "10px", border: "1px solid #ddd", color: "black", fontWeight: "bold", textAlign: "center" }}>업로드 날짜</th>
            <th style={{ padding: "10px", border: "1px solid #ddd", color: "black", fontWeight: "bold", textAlign: "center" }}>상세보기</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((item, index) => (
            <tr
              key={item.b_link || index}
              style={{
                transition: "background-color 0.2s ease",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#5F5F5F")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <td style={{ padding: "10px", textAlign: "center" }}>
              <input 
                type="checkbox"
                checked={stateSelectedRows[data[activeTab]?.keyword || ""]?.[filter]?.includes(index) ?? false} 
                onChange={() => handleRowSelect(index)}
              />
              </td>
              <td style={{ padding: "10px", display: "flex", alignItems: "center", gap:"10px" }}> 
                <img
                  src={filter === "blog" ? item.profile_link : item.i_profile_link}
                  alt="프로필"
                  style={{
                    width: "35px",
                    height: "35px",
                    borderRadius: "60%",
                    objectFit: "cover",
                  }}
                />
                <a
                  href={filter === "blog" ? item.b_link : item.in_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#007bff",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  {item.name}
                </a>
                {item.Existence && (
                  <img
                    src="images/icons/only_logo.png"
                    alt="존재 아이콘"
                    style={{
                      width: "8%",
                      height: "8%",
                      objectFit: "cover",
                    }}
                  />
                )}
              </td>
              <td style={{ padding: "10px"}}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#007bff",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  {item.post_title || "제목 없음"}
                </a>
              </td>
              <td style={{ padding: "10px", textAlign: "center" }}>
                {filter === "blog" ? item.category.replace(/ㆍ/g, "") : item.b_category.replace(/ㆍ/g, "")}
              </td>
              <td style={{ padding: "10px", textAlign: "center" }}>
                {filter === "blog" ? item.Neighbor : item.b_Neighbor}
              </td>
              <td style={{ padding: "10px", textAlign: "center" }}>
                {filter === "blog" ? item.sub : item.date}
              </td>
              <td style={{ padding: "10px", textAlign: "center" }}>
                <button
                  onClick={() => {
                    if (filter === "blog") {
                      const blogId = extractBlogId(item.b_link);
                      if (blogId) handleBlogDetailClick(blogId);
                    } else if (filter === "influencer") {
                      if (item.in_link) handleInfluencerDetailClick(item.in_link);
                    }
                  }}
                  disabled={isLoading}
                  style={{
                    padding: "5px 10px",
                    backgroundColor: isLoading ? "#FED66F" : "#56BFF2",
                    color: "#fff",
                    border: "none",
                    borderRadius: "3px",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  {isLoading ? (
                    <div
                      style={{
                        width: "21px",
                        height: "21px",
                        border: "2px solid #fff",
                        borderTop: "2px solid transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    ></div>
                  ) : (
                    "보기"
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>



      {/* 모달 */}
      {isModalOpen && modalData && (
        <Modal isOpen={isModalOpen} onClose={closeModal} data={modalData} />
      )}
    </div>
  );
};

export default KeywordRanking;
