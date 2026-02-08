import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { FindAllUsersQueryDto } from './dto/find-all-users.dto';
import { ParseQueryPipe } from '../common/pipes/parse-query/parse-query.pipe';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(@Query(new ParseQueryPipe()) query: FindAllUsersQueryDto) {
    return await this.userService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.findOneById(id);
  }

  // Left this POST here just for complete User CRUD routes testing & demonstration
  // TODO: rewrite when implementing signing up flow
  @Post()
  async createOne(@Body() data: CreateUserDto) {
    return await this.userService.create(data);
  }

  @Patch(':id')
  async updateOne(@Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateUserDto) {
    return await this.userService.updateById(id, data);
  }

  @Delete(':id')
  async deleteOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.deleteById(id);
  }
}
