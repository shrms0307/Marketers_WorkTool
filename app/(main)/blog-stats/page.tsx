"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Download } from "lucide-react";
import { getBlogStats } from "./action";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { PageContainer } from "@/components/page-container";
import { useNavbar } from '@/components/layout/navbar-provider'
import { useEffect } from 'react'
interface BlogStats {
  blogId: string;
  averageVisits: number;
  currentVisits: number;
  dailyVisits: { [key: string]: number };
}

export default function BlogStats() {
  const { setTitle } = useNavbar()

  useEffect(() => {
    setTitle('블로그 방문자수 확인')
  }, [setTitle])

  const [urls, setUrls] = useState("https://blog.naver.com/c_lov_\nhttps://blog.naver.com/tjdwndirrnr\nhttps://blog.naver.com/yn_uynu\nhttps://blog.naver.com/dami180729\nhttps://blog.naver.com/hanssemgaon_ai");
  const [stats, setStats] = useState<BlogStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStats([]);

    try {
      const urlList = urls.split('\n').filter(url => url.trim());
      if (!urlList.length) {
        throw new Error('블로그 URL을 입력해주세요.');
      }

      const data = await getBlogStats(urlList);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "통계 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleExcelDownload = () => {
    if (!stats.length) return;

    const dates = getAvailableDates(stats);
    
    const headers = [
      "블로그명", 
      "4일 평균",
      ...dates.map(d => d.label)
    ];
    
    const rows = stats.map(stat => [
      stat.blogId,
      stat.averageVisits.toString(),
      ...dates.map(d => stat.dailyVisits[d.date].toString())
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `블로그_방문자수_${new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, "")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\. /g, '-').replace('.', '');
  };

  const getAvailableDates = (stats: BlogStats[]) => {
    if (!stats.length) return [];
    
    const today = new Date();
    const todayStr = formatDate(today);
    
    return Object.keys(stats[0].dailyVisits)
      .sort((a, b) => {
        const dateA = new Date('20' + a.replace(/-/g, '/'));
        const dateB = new Date('20' + b.replace(/-/g, '/'));
        return dateA.getTime() - dateB.getTime();
      })
      .map(date => ({
        date,
        label: date === todayStr ? `${date} (오늘)` : date
      }));
  };

  return (
    <PageContainer
      description="네이버 블로그의 최근 4일 평균 방문자수를 확인합니다"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>블로그 방문자수 확인</CardTitle>
              <CardDescription>
                네이버 블로그의 최근 4일 평균 방문자수를 확인합니다.
                여러 블로그를 한 번에 확인하려면 URL을 줄바꿈으로 구분해 입력하세요.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExcelDownload}
              disabled={stats.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              엑셀 다운로드
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={urls}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUrls(e.target.value)}
              placeholder="https://blog.naver.com/blogId&#13;&#10;https://blog.naver.com/anotherId"
              className="min-h-[100px]"
              defaultValue="https://blog.naver.com/blogId&#13;&#10;https://blog.naver.com/anotherId"
              required
            />
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "확인 중..." : "방문자수 확인"}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {stats.length > 0 && (
            <div className="mt-4 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>번호</TableHead>
                    <TableHead>블로그명</TableHead>
                    <TableHead>4일 평균</TableHead>
                    {getAvailableDates(stats).map(({ date, label }) => (
                      <TableHead key={date}>
                        {label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((stat, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <a 
                          href={`https://blog.naver.com/${stat.blogId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                          title={stat.blogId}
                        >
                          {stat.blogId}
                        </a>
                      </TableCell>
                      <TableCell>
                        {stat.averageVisits.toLocaleString()}명
                      </TableCell>
                      {getAvailableDates(stats).map(({ date }) => (
                        <TableCell key={date}>
                          {stat.dailyVisits[date].toLocaleString()}명
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
} 