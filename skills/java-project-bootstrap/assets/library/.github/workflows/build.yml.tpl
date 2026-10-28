name: Java library checks
on:
  push:
  pull_request:
permissions:
  contents: read
jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        test-java-version: [@@TEST_JAVA_MATRIX@@]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          persist-credentials: false
      - id: test-jdk
        uses: actions/setup-java@de7274f081f381c8f8158605e0321c36c376e2e6
        with:
          distribution: temurin
          java-version: '${{ matrix.test-java-version }}'
      - uses: actions/setup-java@de7274f081f381c8f8158605e0321c36c376e2e6
        with:
          distribution: temurin
          java-version: '25'
      - name: Build and check
        shell: bash
        env:
          TEST_JAVA_PATH: ${{ steps.test-jdk.outputs.path }}
        run: >-
          ./gradlew --no-daemon build :all:jacocoTestReport
          -PtestJavaVersion=${{ matrix.test-java-version }}
          "-Porg.gradle.java.installations.paths=${TEST_JAVA_PATH}"
