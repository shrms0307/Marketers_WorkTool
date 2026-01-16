import { scrapeNaverData } from './action';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

// Define TypeScript interfaces for type safety
interface Post {
  section?: string;
  date?: string;
  media?: string;
  title?: string;
  url?: string;
  collected_at?: string;  // 수집시각 필드
  orderInSection?: number;
}

interface ScrapeResult {
  relatedKeywords: string[];
  popularTopics: string[];
  table: string[][];
  popularTopicsTable: string[][];
  postsTable: Post[];
  influencerTable: Post[];
  mergedTable: Post[];
}

// Utility function to group posts by section
const groupPostsBySection = (posts: Post[]): Record<string, Post[]> => {
  return posts.reduce((acc, post) => {
    const section = post.section || '기타';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push({
      ...post,
      orderInSection: acc[section].length + 1,
    });
    return acc;
  }, {} as Record<string, Post[]>);
};

// Component for rendering a single section table with section name in the column
const SectionTable = ({
  section,
  posts,
}: {
  section: string;
  posts: Post[];
}) => (
  <div className="mb-6">
    <Table className="border rounded-lg overflow-hidden">
      <TableHeader>
        <TableRow className="bg-gray-100">
          <TableHead className="text-sm w-24">섹션명</TableHead>
          <TableHead className="text-sm w-12 text-center">순서</TableHead>
          <TableHead className="text-sm w-24">게시날짜</TableHead>
          <TableHead className="text-sm w-28">매체명</TableHead>
          <TableHead className="text-sm">게시글 제목</TableHead>
          <TableHead className="text-sm w-16 text-center">URL</TableHead>
          <TableHead className="text-sm w-24">수집날짜</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((post, idx) => (
          <TableRow key={`${section}-${idx}`}>
            <TableCell className="text-sm">{section}</TableCell>
            <TableCell className="text-sm text-center">{post.orderInSection}</TableCell>
            <TableCell className="text-sm">{post.date}</TableCell>
            <TableCell className="text-sm">{post.media}</TableCell>
            <TableCell className="text-sm">{post.title}</TableCell>
            <TableCell className="text-sm text-center">
              {post.url ? (
                <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  링크
                </a>
              ) : (
                '-'
              )}
            </TableCell>
            <TableCell className="text-sm">{post.collected_at || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

// Reusable Table Component for rendering simple tables
const SimpleTable = ({ data }: { data: string[][] }) => (
  <Table>
    <TableBody>
      {data.length > 0 ? (
        data.map((row, idx) => (
          <TableRow key={idx}>
            {row.map((cell, cidx) => (
              <TableCell className="text-sm" key={cidx}>
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell colSpan={data[0]?.length || 1} className="text-gray-500 py-4 text-center">
            데이터 없음
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
);

export default async function KeywordReportsPage({ searchParams }: { searchParams?: { keyword?: string } }) {
  const keyword = searchParams?.keyword || '';
  const result: ScrapeResult = keyword
    ? await scrapeNaverData(keyword)
    : {
        relatedKeywords: [],
        popularTopics: [],
        table: [],
        popularTopicsTable: [],
        postsTable: [],
        influencerTable: [],
        mergedTable: [],
      };

  const sectionGroups = groupPostsBySection(result.mergedTable);

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">키워드 크롤러</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2 mb-6">
            <input
              type="text"
              name="keyword"
              defaultValue={keyword}
              placeholder="키워드를 입력해주세요"
              className="flex-1 border rounded px-3 py-2"
            />
            <Button type="submit">검색</Button>
          </form>

          {keyword && (
            <>
              <h2 className="text-lg font-semibold mb-2">함께 많이 찾는 검색어</h2>
              <SimpleTable data={result.table} />

              <h2 className="text-lg font-semibold mt-8 mb-2">인기 주제</h2>
              {result.popularTopicsTable && result.popularTopicsTable.length > 0 ? (
                <div className="space-y-4">
                  {result.popularTopicsTable.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex flex-wrap gap-2">
                      {row.map((topic, topicIdx) => {
                        const isTopFourInRow = topicIdx < 4;
                        return (
                          <span
                            key={topicIdx}
                            className={`inline-block px-3 py-1 text-sm font-medium rounded-full hover:bg-gray-200 ${
                              isTopFourInRow ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {topic}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 py-4">데이터 없음</div>
              )}

              <h2 className="text-lg font-semibold mt-8 mb-2">게시글 정보</h2>
              {Object.entries(sectionGroups).length > 0 ? (
                Object.entries(sectionGroups).map(([section, posts], sectionIdx) => (
                  <SectionTable
                    key={sectionIdx}
                    section={section}
                    posts={posts}
                  />
                ))
              ) : (
                <div className="text-gray-500 py-4">데이터 없음</div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
