"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Search, Download } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getViewCounts } from "./action";
import { SupportedSitesDialog } from "./supported-sites-dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer } from "@/components/page-container";

import { useNavbar } from '@/components/layout/navbar-provider'
import { useEffect } from 'react'

interface ViewCountResult {
  url: string;
  siteName: string;
  articleId: string;
  boardId?: string;
  viewCount: number;
  commentCount?: number;
}

const formSchema = z.object({
  urls: z.string().min(1, "URL을 입력해주세요"),
});

export default function ViewCounter() {
  const { setTitle } = useNavbar()

  useEffect(() => {
    setTitle('조회수 확인')
  }, [setTitle])

  const [urls, setUrls] = useState("https://cafe.naver.com/1msanbu/3105392");
  const [results, setResults] = useState<ViewCountResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      urls: "https://cafe.naver.com/1msanbu/3105392",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const urlList = values.urls.split('\n').filter(url => url.trim());
      if (!urlList.length) {
        throw new Error('URL을 입력해주세요.');
      }

      const data = await getViewCounts(urlList);
      
      if (!data || data.length === 0) {
        throw new Error('조회수 데이터를 가져올 수 없습니다.');
      }
      
      setResults(data);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('404')) {
          setError('페이지를 찾을 수 없습니다. URL이 올바른지 확인해주세요.');
        } else if (err.message.includes('401')) {
          setError('접근이 거부되었습니다. 해당 사이트에서 조회수 확인이 제한되어 있을 수 있습니다.');
        } else {
          setError(err.message);
        }
      } else {
        setError("조회수를 가져오는데 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExcelDownload = () => {
    if (!results.length) return;

    const headers = ["게시글 URL", "웹사이트", "조회수", "댓글수", "게시글 번호"];
    
    const rows = results.map(result => [
      result.url,
      result.siteName,
      result.viewCount > 0 ? result.viewCount.toString() : "확인 불가",
      result.commentCount ? result.commentCount.toString() : "-",
      result.articleId
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => 
        row.map(cell => {
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `조회수_${new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, "")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageContainer
      title="조회수 확인"
      description="여러 사이트의 게시글 조회수를 한 번에 확인합니다"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>조회수 확인</CardTitle>
              <CardDescription>
                URL을 입력하여 해당 페이지의 조회수를 확인합니다.
                여러 URL을 한 번에 확인하려면 줄바꿈으로 구분해 입력하세요.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExcelDownload}
                disabled={results.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                엑셀 다운로드
              </Button>
              <SupportedSitesDialog />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="urls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-2">
                        <Textarea 
                          placeholder="https://cafe.naver.com/juliett00/1340785" 
                          className="min-h-[100px]"
                          {...field} 
                        />
                        <Button type="submit" disabled={loading}>
                          <Search className="h-4 w-4 mr-2" />
                          {loading ? "확인 중..." : "확인"}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results.length > 0 && (
            <div className="mt-4 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>번호</TableHead>
                    <TableHead className="min-w-1/2">URL</TableHead>
                    <TableHead className="text-right">조회수</TableHead>
                    <TableHead className="text-right">댓글수</TableHead>
                    <TableHead>게시글 번호</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="flex flex-col gap-1">
                          <a 
                            href={result.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline truncate"
                          >
                            {result.url}
                          </a>
                          {result.viewCount === 0 && (
                            <span className="text-xs text-destructive">
                              {result.siteName === "로그인이 필요한 게글" && "로그인 필요"}
                              {result.siteName === "존재하지 않는 게시글" && "페이지 없음"}
                              {result.siteName === "접근 제한된 게시글" && "접근 제한"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {result.viewCount > 0 ? 
                          result.viewCount.toLocaleString() + '회' : 
                          '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {result.commentCount ? 
                          result.commentCount.toLocaleString() + '개' : 
                          '-'}
                      </TableCell>
                      <TableCell>{result.articleId}</TableCell>
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