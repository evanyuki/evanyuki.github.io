---
title: LeetCode-20-有效括号
published: 2022-09-13
description: '**Leetcode 20.Valid Parentheses**'
image: 'https://picsum.photos/seed/a3200b2a27874d96b4b58d0082eef58e/1920/1080'
tags: ["leetcode","算法"]
category: 'leetcode'
draft: false
---

**Leetcode 20.Valid Parentheses**

Given a string containing just the characters’(‘,’)’,’{‘,’}’,’\[‘and’]’, determine if the input string is valid.
An input string is valid if:

1.  Open brackets must be closed by the same type of brackets.
2.  Open brackets must be closed in the correct order.
    Note that an empty string isalso considered valid.

<!---->

    Example1：
    Input: “()[]{}”
    Output: true

    Example2:
    Input: “([)]”
    Output: false

```python
# @Author：Kilien
# @lc app=leetcode id=20 lang=python3
#
# [20] Valid Parentheses
# 思路：使用hashtable标记括号，拆分字符串
# 若字符串不在hashtable中，模拟入栈
# 若栈不为空，栈顶元素出栈，匹配括号则消除，不匹配则报错
class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        par_map = {')':'(',']':'[','}':'{'}

        for c in s:
            if c not in par_map:
                stack.append(c)
            elif not stack or par_map[c] != stack.pop():
                return False
        return not stack 

```