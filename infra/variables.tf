variable "project" {
  description = "Name prefix for all resources"
  type        = string
  default     = "kodomo-money"
}

variable "region" {
  description = "AWS region (Tokyo)"
  type        = string
  default     = "ap-northeast-1"
}

variable "aws_profile" {
  description = "AWS CLI profile used by Terraform"
  type        = string
  default     = "kokuban"
}

variable "instance_type" {
  description = "EC2 instance type. t4g.micro (ARM) is the cheapest practical size for this app"
  type        = string
  default     = "t4g.micro"
}
