output "url" {
  description = "Open this in a browser (after scripts/deploy.sh)"
  value       = "http://${aws_eip.app.public_ip}"
}

output "public_ip" {
  value = aws_eip.app.public_ip
}

output "instance_id" {
  value = aws_instance.app.id
}

output "artifact_bucket" {
  value = aws_s3_bucket.artifacts.bucket
}

output "region" {
  value = var.region
}

output "ssm_prefix" {
  value = local.param_prefix
}

output "connect_command" {
  description = "Log in to the server without SSH"
  value       = "aws ssm start-session --profile ${var.aws_profile} --region ${var.region} --target ${aws_instance.app.id}"
}
