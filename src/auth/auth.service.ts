// src/auth/auth.service.ts
import { Injectable, BadRequestException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { Role, User } from 'src/user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(private dataSource: DataSource, private jwtService: JwtService) { }

  async signup(dto: SignupDto) {
    console.log('SIGNUP ATTEMPT:', dto.email);
    const userRepo = this.dataSource.getRepository(User);

    // Check if email exists
    const existingUser = await userRepo.findOne({ where: { email: dto.email } });
    if (existingUser) throw new BadRequestException('Email already exists');

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: Role.USER,
    });

    await userRepo.save(user);
    console.log('USER SAVED SUCCESSFULLY:', user.id);

    return {
      message: 'User created successfully',
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  async login(dto: LoginDto) {
    try {
      console.log('LOGIN ATTEMPT DTO:', dto);

      const userRepo = this.dataSource.getRepository(User);

      const user = await userRepo.findOne({
        where: { email: dto.email },
      });

      console.log('FOUND USER (partial):', user ? { id: user.id, email: user.email, hasPassword: !!user.password } : null);

      // Defensive: ensure password exists before comparing
      if (!user || !user.password) {
        console.warn('Login failed: user not found or password missing');
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(dto.password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return await this.generateToken(user);

    } catch (error) {
      console.error('LOGIN ERROR:', error.message);

      // If it's already an UnauthorizedException, rethrow it
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Otherwise throw a generic error (avoid exposing internal details)
      throw new InternalServerErrorException('Something went wrong. Please try again.');
    }
  }

  async socialLogin(dto: SocialLoginDto) {
    const userRepo = this.dataSource.getRepository(User);

    let user = await userRepo.findOne({ where: { email: dto.email } });

    if (!user) {
      // Create new user if not exists
      // Generate a random password since they define auth via Google
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = userRepo.create({
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: Role.USER,
        isVerified: true, // Trusted provider
      });

      await userRepo.save(user);
    }

    return this.generateToken(user);
  }

  private generateToken(user: User) {
    const payload = { id: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
