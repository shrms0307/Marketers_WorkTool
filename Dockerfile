# --- 1단계: 기본 이미지 (Base Stage) ---
    FROM node:20-slim AS base
    # Next.js의 standalone 모듈 실행에 필요한 시스템 의존성을 여기에 추가할 수 있습니다.
    # 예를 들어, Puppeteer를 사용하는 경우 런타임에 필요한 Chromium 관련 라이브러리.
    # 빌드 단계와 런타임 단계 모두에서 필요할 수 있는 공통 의존성을 여기에 놓는 것이 좋습니다.
    RUN apt-get update && apt-get install -y \
        chromium \
        fonts-noto-color-emoji \
        libnss3 \
        libfontconfig1 \
        libgbm-dev \
        libatk-bridge2.0-0 \
        libcups2 \
        libdrm-dev \
        libatspi2.0-0 \
        libxkbcommon-dev \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxrandr2 \
        libasound2 \
        libgtk-3-0 \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/*
    
    # --- 2단계: 의존성 설치 (Deps Stage) ---
    FROM base AS deps
    WORKDIR /app
    
    # pnpm 설치
    RUN npm install -g pnpm
    
    # 의존성 파일 복사 및 설치
    COPY package.json pnpm-lock.yaml ./
    RUN pnpm install --frozen-lockfile --prod
    
    # --- 3단계: 빌드 환경 (Builder Stage) ---
    FROM base AS builder
    WORKDIR /app
    
    # === 핵심 변경: builder 스테이지에도 pnpm을 설치합니다 ===
    RUN npm install -g pnpm
    
    # 의존성 복사 (deps 스테이지에서 설치된 것)
    COPY --from=deps /app/node_modules ./node_modules
    # 소스 코드 복사
    COPY . .
    
    # 환경 변수 설정 (빌드 시 필요한 변수)
    ENV NEXT_PUBLIC_API=
    ENV NEXT_FRONT_BASE_API=
    ENV NEXT_FRONT_COMPLETE_MODUSIGN_PRODUCTION=
    ENV NEXT_MODUSIGN_API_KEY=
    ENV NEXT_PUBLIC_ACCESS_TOKEN_EXPIRY_DAYS=7
    
    # Next.js 빌드
    RUN pnpm build
    
    # --- 4단계: 최종 실행 환경 (Runner Stage) ---
    FROM base AS runner
    WORKDIR /app
    
    # 컨테이너 환경에 시스템 사용자 추가 (보안 강화)
    RUN addgroup --system --gid 1001 nodejs
    RUN adduser --system --uid 1001 nextjs
    
    # 빌드 단계에서 생성된 Next.js standalone 결과만 복사
    COPY --from=builder --chown=nextjs:nodejs /app/public ./public
    COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
    COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
    
    # 포트 노출
    EXPOSE 3000
    
    # Next.js 애플리케이션 시작 (standalone 모듈은 node server.js로 실행)
    USER nextjs
    CMD [ "node", "server.js" ]