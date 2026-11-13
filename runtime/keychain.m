#import <Foundation/Foundation.h>
#import <Security/Security.h>

static NSString *const service = @"Motion Relay ChatGPT";
static NSString *const account = @"oauth-profile-v1";

static void respond(NSDictionary *value) {
    NSError *error = nil;
    NSData *data = [NSJSONSerialization dataWithJSONObject:value options:NSJSONWritingSortedKeys error:&error];
    if (!data) data = [@"{\"ok\":false,\"error\":\"serialization\"}" dataUsingEncoding:NSUTF8StringEncoding];
    [[NSFileHandle fileHandleWithStandardOutput] writeData:data];
    [[NSFileHandle fileHandleWithStandardOutput] writeData:[NSData dataWithBytes:"\n" length:1]];
}

static NSMutableDictionary *baseQuery(void) {
    return [@{(__bridge id)kSecClass:(__bridge id)kSecClassGenericPassword,
              (__bridge id)kSecAttrService:service,
              (__bridge id)kSecAttrAccount:account} mutableCopy];
}

int main(void) {
    @autoreleasepool {
        NSFileHandle *input = [NSFileHandle fileHandleWithStandardInput];
        NSMutableData *buffer = [NSMutableData data];
        while (YES) {
            NSData *chunk = [input availableData];
            if (chunk.length == 0) break;
            const uint8_t *bytes = chunk.bytes;
            for (NSUInteger i = 0; i < chunk.length; i++) {
                if (bytes[i] != '\n') { [buffer appendBytes:&bytes[i] length:1]; continue; }
                NSError *jsonError = nil;
                id parsed = [NSJSONSerialization JSONObjectWithData:buffer options:NSJSONReadingFragmentsAllowed error:&jsonError];
                [buffer setLength:0];
                if (![parsed isKindOfClass:[NSDictionary class]]) { respond(@{@"ok":@NO,@"error":@"invalid_request"}); continue; }
                NSDictionary *request = (NSDictionary *)parsed;
                NSString *operation = request[@"operation"];
                NSMutableDictionary *query = baseQuery();
                if ([operation isEqualToString:@"get"]) {
                    query[(__bridge id)kSecReturnData] = @YES;
                    query[(__bridge id)kSecMatchLimit] = (__bridge id)kSecMatchLimitOne;
                    CFTypeRef result = NULL;
                    OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &result);
                    if (status == errSecItemNotFound) respond(@{@"ok":@YES,@"value":[NSNull null]});
                    else if (status == errSecSuccess && result) {
                        NSData *data = CFBridgingRelease(result);
                        NSString *value = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                        if (value) respond(@{@"ok":@YES,@"value":value}); else respond(@{@"ok":@NO,@"error":@"invalid_utf8"});
                    } else respond(@{@"ok":@NO,@"error":@"keychain_read_failed",@"status":@(status)});
                } else if ([operation isEqualToString:@"set"]) {
                    NSString *value = request[@"value"];
                    if (![value isKindOfClass:[NSString class]]) { respond(@{@"ok":@NO,@"error":@"invalid_value"}); continue; }
                    NSData *data = [value dataUsingEncoding:NSUTF8StringEncoding];
                    OSStatus status = SecItemUpdate((__bridge CFDictionaryRef)query, (__bridge CFDictionaryRef)@{(__bridge id)kSecValueData:data});
                    if (status == errSecItemNotFound) {
                        query[(__bridge id)kSecValueData] = data;
                        query[(__bridge id)kSecAttrAccessible] = (__bridge id)kSecAttrAccessibleWhenUnlockedThisDeviceOnly;
                        status = SecItemAdd((__bridge CFDictionaryRef)query, NULL);
                    }
                    respond(status == errSecSuccess ? @{@"ok":@YES} : @{@"ok":@NO,@"error":@"keychain_write_failed",@"status":@(status)});
                } else if ([operation isEqualToString:@"delete"]) {
                    OSStatus status = SecItemDelete((__bridge CFDictionaryRef)query);
                    respond(status == errSecSuccess || status == errSecItemNotFound ? @{@"ok":@YES} : @{@"ok":@NO,@"error":@"keychain_delete_failed",@"status":@(status)});
                } else respond(@{@"ok":@NO,@"error":@"unsupported_operation"});
            }
        }
    }
    return 0;
}
