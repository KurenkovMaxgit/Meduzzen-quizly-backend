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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all users by query parameters',
    description:
      'Returns all users that match query parameters values.\n\
    \nSupports skip, take, filter, search and order values both separately and all at once.\n\
    \n**_NOTE:_** All at once case implemented with AND,so response wil match all the conditions passed.',
  })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async findAll(@Query(new ParseQueryPipe()) query: FindAllUsersDto) {
    return await this.userService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one user by id',
    description: 'Returns one user that match id passed in URL parameter.',
  })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  async findOneById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.findOneBy({ id });
  }

  // Left this POST here just for complete User CRUD routes testing & demonstration
  // TODO: rewrite when implementing signing up flow
  @Post()
  @ApiOperation({
    summary: 'Create new user',
    description:
      'Creates a new user with payload passed in body.\n\
      \n**_NOTE:_** All users must have unique emails.',
  })
  @ApiResponse({ status: 201, description: 'Created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  @ApiResponse({ status: 409, description: 'Database conflict: Duplicate entry.' })
  async createOne(@Body() data: CreateUserDto) {
    return await this.userService.create(data);
  }

  @ApiOperation({
    summary: 'Update user by id',
    description:
      'Updates user by id passed in URL parameter with payload passed in body.\n\
      \n**_NOTE:_** Email update is unavailable.',
  })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  @Patch(':id')
  async updateOneById(@Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateUserDto) {
    return await this.userService.updateBy({ id }, data);
  }

  @ApiOperation({
    summary: 'Delete user by id',
    description: 'Deletes user by id passed in URL parameter.',
  })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  @Delete(':id')
  async deleteOneById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.deleteBy({ id });
  }
}
