export interface ProfileData {
  subscriberCount: number;
  expertType: string;
  styleType: string;
}

export interface NaverProfileResponse {
  props: {
    pageProps: {
      dehydratedState: {
        queries: [{
          state: {
            data: {
              dataSourceMap: {
                [key: string]: {
                  'profile.keyword': [{
                    keyword: string;
                    categoryName: string;
                    expert: boolean;
                  }];
                  'profile.title': [{
                    subscriberCount: number;
                    categoryMyType: string;
                    nickName: string;
                  }];
                };
              };
            };
          };
        }];
      };
    };
  };
} 