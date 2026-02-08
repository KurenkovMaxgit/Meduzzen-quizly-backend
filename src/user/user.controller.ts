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
import { FindAllUsersDto } from './dto/find-user.dto';
import { ParseQueryPipe } from '../common/pipes/parse-query/parse-query.pipe';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(@Query(new ParseQueryPipe()) query: FindAllUsersDto) {
    return await this.userService.findAll(query);
  }

  @Get(':id')
  async findOneById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.findOneBy({ id });
  }

  // Left this POST here just for complete User CRUD routes testing & demonstration
  // TODO: rewrite when implementing signing up flow
  @Post()
  async createOne(@Body() data: CreateUserDto) {
    return await this.userService.create(data);
  }

  @Patch(':id')
  async updateOneById(@Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateUserDto) {
    return await this.userService.updateBy({ id }, data);
  }

  @Delete(':id')
  async deleteOneById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.deleteBy({ id });
  }
}
