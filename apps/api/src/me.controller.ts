import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtGuard } from "./jwt.guard";

@Controller("me")
@UseGuards(JwtGuard)
export class MeController {
  @Get()
  getMe(@Req() req: any) {
    return req.user;
  }
}
