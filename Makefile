# Makefile – URL Copier Extension 🧩

NAME := url-copier
SRC  := src
DIST := dist
BUILD := $(DIST)/$(NAME).xpi

GREEN := \033[0;32m
YELLOW := \033[1;33m
RESET := \033[0m

all: build

build:
	@echo ""
	@echo "$(YELLOW)🔧 Building: $(BUILD)$(RESET)"
	@mkdir -p $(DIST)
	@cd $(SRC) && zip -qr ../$(BUILD) .
	@echo "$(GREEN)✅ Build complete!$(RESET)"
	@echo ""

clean:
	@echo ""
	@echo "$(YELLOW)🧹 Cleaning: $(DIST)/$(RESET)"
	@rm -rf $(DIST)
	@echo "$(GREEN)✅ Cleaned successfully!$(RESET)"
	@echo ""

.PHONY: all build clean
