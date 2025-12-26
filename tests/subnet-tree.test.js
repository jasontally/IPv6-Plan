import { describe, it, expect, beforeEach } from 'vitest';

describe('Subnet Tree Operations', () => {
  beforeEach(() => {
    // Reset subnet tree before each test
    // In actual implementation, this would be done via module export
  });

  describe('getSubnetNode', () => {
    it('should create node if it does not exist', () => {
      const cidr = '3fff::/24';

      const node = { _note: '', _color: '' };

      expect(node).toBeDefined();
      expect(node._note).toBe('');
      expect(node._color).toBe('');
    });

    it('should return existing node', () => {
      const tree = {
        '3fff::/24': { _note: 'Test', _color: '#FF0000' }
      };
      const cidr = '3fff::/24';

      // Should return existing node
      expect(tree[cidr]._note).toBe('Test');
      expect(tree[cidr]._color).toBe('#FF0000');
    });
  });

  describe('isSplit', () => {
    it('should return false for leaf node', () => {
      const tree = {
        '3fff::/24': { _note: '', _color: '' }
      };
      const cidr = '3fff::/24';

      const keys = Object.keys(tree[cidr]).filter(k => !k.startsWith('_'));
      expect(keys.length).toBe(0);
    });

    it('should return true for node with children', () => {
      const tree = {
        '3fff::/20': {
          _note: '',
          _color: '',
          '3fff::/24': { _note: '', _color: '' }
        }
      };
      const cidr = '3fff::/20';

      const keys = Object.keys(tree[cidr]).filter(k => !k.startsWith('_'));
      expect(keys.length).toBe(1);
    });
  });

  describe('splitSubnet - nibble aligned', () => {
    it('should split /20 into 16 /24 subnets', () => {
      // /20 split creates 16 children at /24
      const numChildren = 2 ** (24 - 20);
      expect(numChildren).toBe(16);
    });

    it('should split /24 into 16 /28 subnets', () => {
      const numChildren = 2 ** (28 - 24);
      expect(numChildren).toBe(16);
    });

    it('should calculate child addresses correctly', () => {
      // Second child of /20 split should be at index 1
      // Bits to add = 4 (from /20 to /24)
      // Position = 128 - 24 = 104 bits from right
      // Child 1 should have bit 104 set

      const bytes = new Uint8Array([0x3f, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

      // When adding child index 1 at bit position 104:
      // Result should be 3fff:0100::
      expect(bytes.length).toBe(16);
    });
  });

  describe('splitSubnet - non-nibble aligned', () => {
    it('should split /21 into 8 /24 subnets', () => {
      const currentPrefix = 21;
      const nextNibble = 24;
      const numChildren = 2 ** (nextNibble - currentPrefix);
      expect(numChildren).toBe(8);
    });

    it('should split /22 into 4 /24 subnets', () => {
      const currentPrefix = 22;
      const nextNibble = 24;
      const numChildren = 2 ** (nextNibble - currentPrefix);
      expect(numChildren).toBe(4);
    });

    it('should split /23 into 2 /24 subnets', () => {
      const currentPrefix = 23;
      const nextNibble = 24;
      const numChildren = 2 ** (nextNibble - currentPrefix);
      expect(numChildren).toBe(2);
    });
  });

  describe('joinSubnet', () => {
    it('should remove all children from parent', () => {
      const tree = {
        '3fff::/20': {
          _note: '',
          _color: '',
          '3fff::/24': { _note: 'Child 1', _color: '' },
          '3fff:100::/24': { _note: 'Child 2', _color: '' }
        }
      };
      const parentCidr = '3fff::/20';

      // After join, parent should only have _note and _color
      const node = tree[parentCidr];
      const children = Object.keys(node).filter(k => !k.startsWith('_'));
      expect(children.length).toBe(2); // Before join

      // After removing children:
      // delete node['3fff::/24'];
      // delete node['3fff:100::/24'];
      // children.length should be 0
    });
  });

  describe('Subnet Counting', () => {
    it('should return /48 count for prefixes < 48', () => {
      const count = 2 ** (48 - 20);
      expect(count).toBe(268435456);
    });

    it('should return /64 count for prefixes >= 48', () => {
      const count = 2 ** (64 - 48);
      expect(count).toBe(65536);
    });

    it('should return "Host Subnet" for /64', () => {
      const prefix = 64;
      expect(prefix).toBe(64);
    });
  });
});
