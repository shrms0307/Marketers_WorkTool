import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

const SUPPORTED_SITES = [
  { name: "네이버 카페", pattern: "cafe.naver.com" },
  { name: "디시인사이드", pattern: "gall.dcinside.com" },
  { name: "루리웹", pattern: "bbs.ruliweb.com" },
  { name: "뽐뿌", pattern: "ppomppu.co.kr" },
  { name: "딜바다", pattern: "dealbada.com" },
  { name: "판 네이트", pattern: "pann.nate.com" },
  { name: "꼬르넷", pattern: "ggoorr.net" },
  { name: "돈뿌", pattern: "donppu.com" },
  { name: "시티 FIFA", pattern: "city.kr" },
  { name: "빠삭", pattern: "bbasak.com" },
  { name: "와이고수", pattern: "ygosu.com" },
  { name: "아르카라이브", pattern: "arca.live" },
  { name: "더쿠", pattern: "theqoo.net" },
  { name: "이지데이", pattern: "ezday.co.kr" },
  { name: "인스티즈", pattern: "instiz.net" },
  { name: "디미토리", pattern: "dmitory.com" },
].sort((a, b) => a.name.localeCompare(b.name)); // 가나다순 정렬

export function SupportedSitesDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="h-4 w-4 mr-2" />
          지원 사이트 확인
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>지원하는 사이트 목록</DialogTitle>
          <DialogDescription>
            아래 사이트들의 게시글 조회수를 확인할 수 있습니다.
            <br />
            조회수 확인이 안되는 경우 핫딜 게시글이 맞는지 확인해주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {SUPPORTED_SITES.map((site) => (
            <div
              key={site.pattern}
              className="p-2 rounded-lg border bg-muted/50"
            >
              <div className="font-medium">{site.name}</div>
              <div className="text-xs text-muted-foreground">{site.pattern}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
} 