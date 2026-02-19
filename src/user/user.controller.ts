import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth-jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../common/entities/user.entity';
import { ReturnUserDto } from './dto/return-user.dto';
import { FindAllUsersDto } from './dto/find-user.dto';
import { FindOneQueryDto } from '../common/dto/find-one-query.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('me')
  findProfile(@CurrentUser() user: User) {
    return new ReturnUserDto(user);
  }

  @ApiOperation({
    summary: 'Get all users by query parameters',
    description:
      'Returns all users that match query parameters values.\n\
    \nSupports skip, take, filter, search and order values both separately and all at once.\n\
    \n**_NOTE:_** All at once case implemented with AND,so response wil match all the conditions passed.',
  })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @UseGuards(JwtAuthGuard)
  @Get('list')
  async findAll(@Query() query: FindAllUsersDto) {
    return await this.userService.findAll(query);
  }

  @ApiOperation({
    summary: 'Get one user by id',
    description: 'Returns one user that match id passed in URL parameter.',
  })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':id')
  async findOneById(@Param('id', ParseUUIDPipe) id: string, @Query() query: FindOneQueryDto) {
    const user = await this.userService.findOneBy({ id }, { relations: query.relations });
    return user ? new ReturnUserDto(user) : user;
  }

  @ApiOperation({
    summary: 'Update authenticated user',
    description: '**_NOTE:_** Email update is unavailable.',
  })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Patch()
  async updateOneById(@CurrentUser('id') id: string, @Body() data: UpdateUserDto) {
    return new ReturnUserDto(await this.userService.updateBy({ id }, data));
  }

  @ApiOperation({
    summary: 'Deletes authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  @UseGuards(JwtAuthGuard)
  @Delete()
  async deleteOneById(@CurrentUser('id') id: string) {
    return await this.userService.deleteBy({ id });
  }
}
