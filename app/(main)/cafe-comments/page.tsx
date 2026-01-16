"use client";

import { useState, useEffect } from "react";
import { PageContainer } from "@/components/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { extractComments } from "@/app/(main)/cafe-comments/cafe";
import { Navbar } from "@/components/layout/navbar";
import { useNavbar } from '@/components/layout/navbar-provider'

interface CommentData {
  id: number;
  date: string;
  writer: {
    id: string;
    nick: string;
  };
  contents: string;
  scraps: number;
  parentCommentNo: number;
  isReply: boolean;
  displayNumber?: string | number;
}

export default function CafeComments() {
  const { setTitle } = useNavbar()

  useEffect(() => {
    setTitle('카페 댓글 추출')
  }, [setTitle])

  const [url, setUrl] = useState("https://cafe.naver.com/nowiam/4013");
  const [formType, setFormType] = useState("default");
  const [dataType, setDataType] = useState("default");
  const [banId, setBanId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [comments, setComments] = useState<CommentData[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.includes("https")) {
      setError("올바른 URL을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await extractComments(url);
      const filteredData = processComments(data);
      setComments(filteredData);
    } catch (err) {
      // 첫 번째 시도 실패 시 자동으로 한 번 더 시도
      try {
        const data = await extractComments(url);
        const filteredData = processComments(data);
        setComments(filteredData);
      } catch (retryErr) {
        setError("댓글 추출에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const processComments = (data: CommentData[]) => {
    try {
      console.log('Input data:', data); // 입력 데이터 확인

      // 기본 필터링 적용
      const filteredData = data.filter(comment => {
        if (banId && comment.writer.id === banId) return false;
        if (dataType === "link") {
          const hasLink = comment.contents.includes("http://") || comment.contents.includes("https://");
          return hasLink;
        }
        return true;
      });

      // 먼저 모든 댓글의 ID 맵을 만들어서 유효성 검사
      const commentMap = new Map(filteredData.map(comment => [comment.id, comment]));

      // 답글 구조로 정리
      const mainComments: CommentData[] = [];
      const replyMap: { [key: number]: CommentData[] } = {};
      let mainCommentCount = 0;

      filteredData.forEach(comment => {
        // parentCommentNo가 0이거나, 부모 댓글이 존재하지 않으면 메인 댓글로 처리
        if (!comment.isReply || !commentMap.has(comment.parentCommentNo)) {
          mainCommentCount++;
          mainComments.push({
            ...comment,
            isReply: false, // 강제로 메인 댓글로 설정
            displayNumber: mainCommentCount
          });
        } else {
          if (!replyMap[comment.parentCommentNo]) {
            replyMap[comment.parentCommentNo] = [];
          }
          replyMap[comment.parentCommentNo].push(comment);
        }
      });

      // 메인 댓글과 답글을 순서대로 합치기
      const organizedComments: CommentData[] = [];
      mainComments.forEach(mainComment => {
        organizedComments.push({
          ...mainComment,
          displayNumber: String(mainComment.displayNumber || mainCommentCount)
        });
        
        if (replyMap[mainComment.id]) {
          replyMap[mainComment.id].forEach((reply, replyIndex) => {
            organizedComments.push({
              ...reply,
              displayNumber: `ㄴ - ${replyIndex + 1}`
            });
          });
        }
      });

      console.log('Organized comments:', organizedComments); // 결과 확인
      return organizedComments;

    } catch (error) {
      console.error('Error in processComments:', error);
      return data; // 에러 발생 시 원본 데이터 반환
    }
  };

  const handleExcelDownload = () => {
    if (!comments.length) return;

    const headers = ["번호", "시간", "작성자 ID", "작성자 닉네임", "내용", "스크랩수"];
    const rows = comments.map((comment) => [
      comment.displayNumber?.toString() || "",
      comment.date,
      comment.writer.id,
      comment.writer.nick,
      comment.isReply ? `└ ${comment.contents}` : comment.contents,
      comment.scraps.toString()
    ]);

    // BOM 추가로 한글 깨짐 방지
    const csv = [
      headers.join(","),
      ...rows.map(row => 
        row.map(cell => {
          // 모든 셀을 문자열로 변환
          const cellStr = String(cell);
          // 쉼표나 줄바꿈이 있는 경우 큰따옴표로 감싸기
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
    link.setAttribute("download", `네이버_카페_댓글_${new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, "")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageContainer
      title="카페 댓글 추출"
      description="네이버 카페 게시글의 댓글을 엑셀 형식으로 추출합니다"
    >
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>카페 댓글 추출</CardTitle>
              <CardDescription>
                네이버 카페 게시글의 댓글을 엑셀 형식으로 추출합니다.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExcelDownload}
              disabled={comments.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              엑셀 다운로드
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="url">게시글 링크</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://cafe.naver.com/..."
                  defaultValue="https://cafe.naver.com/1msanbu/3105392"
                  required
                />
              </div>
              
              <div>
                <Label>출력 형식</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue placeholder="출력 형식 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">시간별 댓글 출력</SelectItem>
                    <SelectItem value="user">유저별 댓글 출력</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>데이터 형식</Label>
                <Select value={dataType} onValueChange={setDataType}>
                  <SelectTrigger>
                    <SelectValue placeholder="데이터 형식 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">모든 댓글 출력</SelectItem>
                    <SelectItem value="link">링크 댓글만 출력</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="banId">추출 제외할 ID</Label>
                <Input
                  id="banId"
                  value={banId}
                  onChange={(e) => setBanId(e.target.value)}
                  placeholder="제외할 ID 입력"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "추출 중..." : "댓글 추출하기"}
              </Button>
            </div>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {comments.length > 0 && (
            <div className="mt-4 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[10vh]">번호</TableHead>
                    <TableHead className="w-[10vh]">작성자 ID</TableHead>
                    <TableHead className="w-[10vh]">작성자 닉네임</TableHead>
                    <TableHead className="min-w-[50vh] w-full">내용</TableHead>
                    <TableHead className="w-[10vh] text-right">스크랩수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comments.map((comment) => (
                    <TableRow 
                      key={comment.id}
                      className={comment.isReply ? "bg-muted/50" : ""}
                    >
                      <TableCell className="font-medium whitespace-nowrap">
                        {comment.displayNumber}
                      </TableCell>
                      <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis">
                        {comment.writer.id}
                      </TableCell>
                      <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis">
                        {comment.writer.nick}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {comment.isReply && (
                            <>
                              <span className="text-muted-foreground mr-2">┗</span>
                              <span className="w-6" />
                            </>
                          )}
                          <span 
                            className={
                              comment.isReply 
                                ? "text-muted-foreground border-l-2 pl-2 py-1" 
                                : ""
                            }
                          >
                            {comment.contents}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {comment.scraps}
                      </TableCell>
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