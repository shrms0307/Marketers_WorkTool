# Smart Service (마케팅 업무 지원 툴)

마케팅 팀의 업무 효율을 높이기 위한 **프로젝트/키워드/블로거 분석 통합 툴**입니다.
프로젝트 진행현황 추적과 보고서 자동화, 키워드 분석 및 순위 집계를 통해 마케터의 반복 작업을 줄이고 데이터 기반 의사결정을 지원합니다.

## 프로젝트 개요
- **기간**: 2024.03 ~ 2025.01
- **팀 구성**: 4명
- **기여도**: 50%

## 내가 기여한 내용
> 역할: **백엔드(Application Server) 담당**

이 저장소는 Next.js 기반 프론트/풀스택 코드이며, **Application Server에서 수행한 백엔드 작업은 별도 서비스/저장소에서 진행**되었습니다.
아래는 해당 서버에서 실제로 담당했던 핵심 작업입니다.

### 1) 키워드 기능 개발(직접 설계/구현)
- **keyword_crawler**: 외부 데이터 수집 및 정규화 파이프라인 구현
- **keyword_ranking**: 기간/조건별 키워드 순위 집계 로직 개발
- **keyword_reports**: 키워드 기반 리포트 생성 및 내보내기 처리
- **keywordSearch**: 고속 검색을 위한 필터링/정렬 API 구성

### 2) 프로젝트 진행현황 추적 및 보고서 자동화
- 프로젝트 상태/지표를 수집하고 **진행현황 리포트**를 자동 생성
- 담당자/기간별 조회 기능을 통해 **운영 리드타임 단축**

### 3) 블로거/인플루언서 분석
- 게시물/반응 지표 기반의 분석 데이터 집계
- 프로젝트 성과에 영향을 주는 핵심 지표 제공

## 성과
- **마케터 업무 처리 속도 약 40% 개선**
	- 키워드 수집/보고서 자동화로 수작업 최소화

## 기술 스택
### Frontend / Fullstack
- Next.js (App Router)
- TypeScript
- Tailwind CSS

### Backend / Data
- Node.js (Application Server)
- MySQL
- Drizzle ORM
- Supabase (Auth, 데이터 연동)

### Infra / DevOps
- Docker, Docker Compose

## 로컬 실행
```bash
pnpm dev
```

## 참고
- 본 저장소는 **프론트엔드/풀스택 영역**을 포함합니다.
- 백엔드(Application Server) 코드는 별도 서비스로 분리되어 운영되었습니다.
  ㄴ> https://github.com/shrms0307/Marketers_WorkTool-AppServer.git
