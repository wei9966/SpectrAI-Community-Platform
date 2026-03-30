// 所有类型从 @spectrai-community/shared 导入
// 不要在此处重复定义类型

export type {
  Resource,
  PublicResource,
  ResourceType,
  ResourceContentBase,
  WorkflowContent,
  TeamContent,
  SkillContent,
  MCPContent,
  CreateResourceInput,
  UpdateResourceInput,
  ResourceComment,
  PublicComment,
  User,
  PublicUser,
  UserRole,
  CreateUserInput,
  UpdateUserInput,
  ApiResponse,
  PaginationParams,
  SearchParams,
  PaginatedResponse,
  LoginRequest,
  RegisterRequest,
  GithubAuthRequest,
  AuthResponse,
  ChangePasswordRequest,
  ApiError as ApiErrorType,
} from '@spectrai-community/shared';

// 导出 ResourceType 枚举
export { ResourceType as ResourceTypeEnum } from '@spectrai-community/shared';
