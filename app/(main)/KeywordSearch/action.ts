// 키워드 챌린지 여부 확인
export const checkKeywordInDB = async (
  keyword: string
): Promise<{ exists: boolean; data?: { participation: string; category: string; img: string } }> => {
  try {
    const response = await fetch("/api/checkKeyword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });

    if (!response.ok) {
      throw new Error("Failed to check keyword");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API 호출 중 에러:", error);
    throw new Error("키워드 확인 중 문제가 발생했습니다.");
  }
};



// 네이버 검색 광고 결과 요청
export const sendKeywords = async (keywords: string[]): Promise<any> => {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    throw new Error("키워드는 배열 형식이어야 하며, 최소 1개 이상의 값을 포함해야 합니다.");
  }

  try {
    // 데이터 준비
    const data = { keywords };

    // 요청 보내기
    const response = await fetch("https://tvdatacenter.synology.me:8812/s_ad/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    // 응답 상태 확인
    if (!response.ok) {
      const errorText = await response.text();
      console.error("서버 응답 에러:", errorText);
      throw new Error(`서버 에러: ${response.status} - ${response.statusText}`);
    }

    // 결과 반환
    const result = await response.json();
    console.log("서버 응답:", result);
    return result;
  } catch (error) {
    console.error("요청 실패:", error);
    throw error;
  }
};

// 키워드 순위 추출 요청
export const sendSelectedKeywords = async (userId: string, keywords: string[]): Promise<any> => {
  if (!userId || typeof userId !== "string") {
    throw new Error("유효한 유저 ID가 필요합니다.");
  }
  if (!Array.isArray(keywords) || keywords.length === 0) {
    throw new Error("키워드는 배열 형식이어야 하며, 최소 1개 이상의 값을 포함해야 합니다.");
  }

  try {
    // 데이터 준비
    const data = { userId, keywords };

    // 요청 보내기
    const response = await fetch("https://tvdatacenter.synology.me:8812/NSR/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    // 응답 상태 확인
    if (!response.ok) {
      const errorText = await response.text();
      console.error("서버 응답 에러:", errorText);
      throw new Error(`서버 에러: ${response.status} - ${response.statusText}`);
    }

    // 결과 반환
    const result = await response.json();
    console.log("서버 응답:", result);
    return result;
  } catch (error) {
    console.error("요청 실패:", error);
    throw error;
  }
};


// 상세보기 -> 인플루언서 키워드 챌린지 정보 요청
export const sendInLink = async (inLink: string): Promise<any> => {
  if (!inLink) {
    console.error("inLink 값이 유효하지 않습니다.");
    throw new Error("inLink 값이 유효하지 않습니다.");
  }

  try {
    console.log("전송할 inLink:", inLink); // 디버깅용 로그

    const data = { link: inLink };

    const response = await fetch("https://tvdatacenter.synology.me:8812/inkr/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("서버 응답 에러:", errorText);
      throw new Error(`서버 에러: ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();
    console.log("서버 응답:", result);
    return result;
  } catch (error) {
    console.error("요청 실패:", error);
    throw error;
  }
};
